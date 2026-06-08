/*
 * DTU TCP Listener — receives the FJ2412 4G DTU connection and reads the
 * NL-X16 controller over Modbus RTU (transparent mode: our server is master).
 *
 * Flow:  DTU dials in (TCP client) → we poll Modbus reads → DTU relays to RS485
 *        → controller responds → we decode, map registers to fields, save.
 *
 * Enable by setting DTU_LISTENER_PORT (and pointing the DTU at this host:port).
 * NOTE: needs a host with a public IP + open TCP port (not Render's web service).
 */
const net = require('net');
const Device = require('../models/Device');
const { processSensorData } = require('./sensorProcessor');
const cfg = require('../config/dtuConfig');

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

// Parse a Modbus RTU read response. Returns array of unsigned 16-bit registers, or null.
function parseResponse(buf, slave, func) {
  if (buf.length < 5) return null;
  if (buf[0] !== slave) return null;
  if (buf[1] !== func) {
    if (buf[1] === (func | 0x80)) console.warn(`[DTU] Modbus exception code ${buf[2]}`);
    return null;
  }
  const byteCount = buf[2];
  const total = 3 + byteCount + 2;
  if (buf.length < total) return null;              // wait for more bytes
  const body = buf.slice(0, total);
  const crcGot = body[total - 2] | (body[total - 1] << 8);
  if (crc16(body.slice(0, total - 2)) !== crcGot) { console.warn('[DTU] CRC mismatch'); return null; }
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

async function saveReading(reading) {
  const device = await Device.findOne({ deviceId: cfg.deviceId, isActive: true });
  if (!device) {
    console.warn(`[DTU] No active device "${cfg.deviceId}" — register it in the app (Devices). Skipping save.`);
    return;
  }
  await processSensorData(device, reading);
  console.log(`[DTU] Saved reading for house ${device.houseNumber}:`, reading);
}

let server;
function startDtuListener() {
  const port = parseInt(process.env.DTU_LISTENER_PORT || '', 10);
  if (!port) return; // disabled unless configured

  server = net.createServer((socket) => {
    const who = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[DTU] Connected: ${who}`);
    let acc = Buffer.alloc(0);

    const poll = () => {
      if (cfg.map.length === 0 && !cfg.discovery) return;
      const req = buildReadRequest(cfg.slaveId, cfg.functionCode, cfg.block.start, cfg.block.count);
      socket.write(req);
    };
    poll();
    const timer = setInterval(poll, cfg.pollSeconds * 1000);

    socket.on('data', async (chunk) => {
      acc = Buffer.concat([acc, chunk]);
      console.log(`[DTU] RAW ${who}: ${chunk.toString('hex')}`); // raw log → reverse-engineer registers
      const regs = parseResponse(acc, cfg.slaveId, cfg.functionCode);
      if (!regs) return;
      acc = Buffer.alloc(0);

      if (cfg.discovery) {
        regs.forEach((r, i) => console.log(`[DTU] reg[${cfg.block.start + i}] = ${r}  (/10=${(r / 10).toFixed(1)})`));
      }
      if (cfg.map.length > 0) {
        try { await saveReading(registersToReading(regs)); }
        catch (e) { console.error('[DTU] save error:', e.message); }
      }
    });

    socket.on('close', () => { clearInterval(timer); console.log(`[DTU] Closed: ${who}`); });
    socket.on('error', (e) => { clearInterval(timer); console.warn(`[DTU] Socket error ${who}: ${e.message}`); });
  });

  server.listen(port, () => {
    console.log(`[DTU] Listener started on TCP :${port} — point the FJ2412 DTU here.` +
      (cfg.discovery ? ' (DISCOVERY mode — logging registers)' : '') +
      (cfg.map.length === 0 && !cfg.discovery ? ' (no register map yet — set DTU_DISCOVERY=true)' : ''));
  });
  server.on('error', (e) => console.error(`[DTU] Listener error: ${e.message}`));
}

module.exports = { startDtuListener, crc16, buildReadRequest, parseResponse, registersToReading };
