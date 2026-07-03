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
const queue = []; // readings that failed to upload (kept in order, capped)
const QUEUE_MAX = 500;

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
    log(`Upload failed (${e.message}) — buffered (${queue.length} queued)`);
  }
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = queue.slice(0, 100);
  try {
    await post(`${cfg.apiUrl}/api/sensor-data/bulk`, { readings: batch });
    queue.splice(0, batch.length);
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

  const poll = () => {
    if (cfg.map.length === 0 && !cfg.discovery) return;
    acc = Buffer.alloc(0); // fresh frame per poll
    socket.write(buildReadRequest(cfg.slaveId, cfg.functionCode, cfg.blockStart, cfg.blockCount));
  };
  poll();
  const timer = setInterval(poll, cfg.pollSeconds * 1000);

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

  socket.on('close', () => { clearInterval(timer); log(`DTU disconnected: ${who}`); });
  socket.on('error', (e) => { clearInterval(timer); log(`Socket error ${who}: ${e.message}`); });
});

server.listen(cfg.listenPort, () => {
  log(`ABIS bridge listening on TCP :${cfg.listenPort} — point the FJ2412 DTU at this Pi's IP.`);
  if (cfg.discovery) log('DISCOVERY mode: registers will be logged; fill config.map, then set discovery=false.');
  else if (cfg.map.length === 0) log('No register map configured — set discovery=true to find the registers first.');
});
server.on('error', (e) => { log(`Listener error: ${e.message}`); process.exit(1); });
