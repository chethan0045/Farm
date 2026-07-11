#!/usr/bin/env node
/*
 * ABIS NL-X16 → KVS Farm bridge (runs on the farm Raspberry Pi).
 *
 * The FJ2412 DTU (transparent TCP client mode) dials into this script on the
 * local network. We act as Modbus-RTU master: poll a register block, decode,
 * map registers to sensor fields, and POST the reading to the cloud API with
 * the device's X-API-Key — exactly like an ESP32 would. All threshold checks,
 * alerts and automation then run in the cloud as usual.
 *
 * No npm dependencies. Requires Node 18+ (global fetch).
 *
 *   node abis-bridge.js            # config read from ./config.json
 *
 * Start in discovery mode (config.discovery = true): every register is logged
 * so you can match values against the controller screen, then fill config.map
 * and set discovery back to false.
 */
const net = require('net');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const log = (...a) => console.log(new Date().toISOString(), ...a);

if (!cfg.apiKey || cfg.apiKey.startsWith('PASTE')) {
  log('WARNING: config.apiKey is not set — readings will not upload. ' +
      'Register the device in the app (Devices page) and paste its API key.');
}

// --- Remote config (Settings page → ABIS NL-X16) ---
// The app's Settings page stores the Modbus/polling config in the cloud;
// we pull it with the same API key used for uploads and overlay it on the
// local config.json. Local file stays the fallback when the cloud is
// unreachable. apiUrl/apiKey/listenPort are deliberately NOT remote-managed —
// a bad value there would cut the bridge off from the cloud for good.
const REMOTE_KEYS = ['slaveId', 'functionCode', 'blockStart', 'blockCount', 'pollSeconds', 'discovery', 'map'];
async function syncRemoteConfig() {
  if (!cfg.apiKey || cfg.apiKey.startsWith('PASTE')) return;
  try {
    const res = await fetch(`${cfg.apiUrl}/api/settings/bridge/abis`, {
      headers: { 'X-API-Key': cfg.apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    const remote = await res.json();
    if (!remote || typeof remote !== 'object') return;
    const changed = [];
    for (const k of REMOTE_KEYS) {
      if (remote[k] === undefined) continue;
      if (JSON.stringify(cfg[k]) !== JSON.stringify(remote[k])) {
        cfg[k] = remote[k];
        changed.push(k);
      }
    }
    if (changed.length) log(`Remote config applied: ${changed.join(', ')}`);
  } catch (e) {
    log(`Remote config fetch failed: ${e.message}`);
  }
}
syncRemoteConfig();
setInterval(syncRemoteConfig, 5 * 60 * 1000);

// --- Modbus RTU helpers ---
function crc16(buf) {
  let crc = 0xFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  return crc;
}

function buildReadRequest(slave, func, start, count) {
  const b = Buffer.from([slave, func, start >> 8, start & 0xFF, count >> 8, count & 0xFF]);
  const crc = crc16(b);
  return Buffer.concat([b, Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF])]);
}

// Parse a Modbus RTU read response → array of unsigned 16-bit registers, or null (incomplete/invalid).
function parseResponse(buf, slave, func) {
  if (buf.length < 5) return null;
  if (buf[0] !== slave) return null;
  if (buf[1] !== func) {
    if (buf[1] === (func | 0x80)) log(`Modbus exception code ${buf[2]}`);
    return null;
  }
  const byteCount = buf[2];
  const total = 3 + byteCount + 2;
  if (buf.length < total) return null;
  const body = buf.slice(0, total);
  const crcGot = body[total - 2] | (body[total - 1] << 8);
  if (crc16(body.slice(0, total - 2)) !== crcGot) { log('CRC mismatch'); return null; }
  const regs = [];
  for (let i = 0; i < byteCount; i += 2) regs.push(body.readUInt16BE(3 + i));
  return regs;
}

function registersToReading(regs) {
  const reading = {};
  for (const m of cfg.map) {
    let raw = regs[m.offset];
    if (raw === undefined) continue;
    if (m.signed && raw > 0x7FFF) raw -= 0x10000;
    reading[m.field] = +(raw * (m.scale ?? 1)).toFixed(3);
  }
  return reading;
}

// --- Cloud upload with offline buffering ---
// The queue survives restarts/power cuts: it's persisted to disk (throttled)
// and reloaded on start, so hours of buffered readings aren't lost when the
// Pi reboots mid-outage.
const QUEUE_MAX = 500;
const QUEUE_FILE = path.join(__dirname, 'queue.json');
const queue = (() => {
  try {
    const saved = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    if (Array.isArray(saved) && saved.length) {
      log(`Restored ${saved.length} buffered readings from ${QUEUE_FILE}`);
      return saved.slice(-QUEUE_MAX);
    }
  } catch {} // no file yet or corrupt — start empty
  return [];
})();

let queueDirty = false;
function persistQueue() {
  if (!queueDirty) return;
  try {
    // Write-then-rename so a power cut mid-write can't corrupt the file
    fs.writeFileSync(QUEUE_FILE + '.tmp', JSON.stringify(queue));
    fs.renameSync(QUEUE_FILE + '.tmp', QUEUE_FILE);
    queueDirty = false;
  } catch (e) {
    log(`Queue persist failed: ${e.message}`);
  }
}
setInterval(persistQueue, 10000);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { persistQueue(); process.exit(0); });
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg.apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function upload(reading) {
  try {
    await post(`${cfg.apiUrl}/api/sensor-data`, reading);
    log('Uploaded:', JSON.stringify(reading));
  } catch (e) {
    queue.push({ ...reading, timestamp: new Date().toISOString() });
    while (queue.length > QUEUE_MAX) queue.shift();
    queueDirty = true;
    log(`Upload failed (${e.message}) — buffered (${queue.length} queued)`);
  }
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = queue.slice(0, 100);
  try {
    await post(`${cfg.apiUrl}/api/sensor-data/bulk`, { readings: batch });
    queue.splice(0, batch.length);
    queueDirty = true;
    log(`Flushed ${batch.length} buffered readings (${queue.length} left)`);
  } catch (e) {
    log(`Bulk flush failed: ${e.message}`);
  }
}
setInterval(flushQueue, 60000);

// --- TCP listener the DTU dials into ---
const server = net.createServer((socket) => {
  const who = `${socket.remoteAddress}:${socket.remotePort}`;
  log(`DTU connected: ${who}`);
  socket.setKeepAlive(true, 30000);
  let acc = Buffer.alloc(0);

  // setTimeout chain (not setInterval) so a pollSeconds change from the
  // remote config takes effect on the next cycle without reconnecting.
  let timer = null;
  const poll = () => {
    if (cfg.map.length > 0 || cfg.discovery) {
      acc = Buffer.alloc(0); // fresh frame per poll
      socket.write(buildReadRequest(cfg.slaveId, cfg.functionCode, cfg.blockStart, cfg.blockCount));
    }
    timer = setTimeout(poll, cfg.pollSeconds * 1000);
  };
  poll();

  socket.on('data', async (chunk) => {
    acc = Buffer.concat([acc, chunk]);
    if (cfg.discovery) log(`RAW: ${chunk.toString('hex')}`);
    const regs = parseResponse(acc, cfg.slaveId, cfg.functionCode);
    if (!regs) return;
    acc = Buffer.alloc(0);

    if (cfg.discovery) {
      regs.forEach((r, i) => log(`reg[${cfg.blockStart + i}] = ${r}  (/10=${(r / 10).toFixed(1)}, /100=${(r / 100).toFixed(2)})`));
    }
    if (cfg.map.length > 0) {
      const reading = registersToReading(regs);
      if (Object.keys(reading).length > 0) await upload(reading);
    }
  });

  socket.on('close', () => { clearTimeout(timer); log(`DTU disconnected: ${who}`); });
  socket.on('error', (e) => { clearTimeout(timer); log(`Socket error ${who}: ${e.message}`); });
});

server.listen(cfg.listenPort, () => {
  log(`ABIS bridge listening on TCP :${cfg.listenPort} — point the FJ2412 DTU at this Pi's IP.`);
  if (cfg.discovery) log('DISCOVERY mode: registers will be logged; fill config.map, then set discovery=false.');
  else if (cfg.map.length === 0) log('No register map configured — set discovery=true to find the registers first.');
});
server.on('error', (e) => { log(`Listener error: ${e.message}`); process.exit(1); });
