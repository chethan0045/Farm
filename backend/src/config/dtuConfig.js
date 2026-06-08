/*
 * FJ2412 DTU → NL-X16 Modbus configuration.
 *
 * The DTU runs in transparent mode: it relays raw Modbus-RTU bytes between our
 * TCP listener and the controller's RS485 bus. Our server is the Modbus MASTER —
 * it polls the registers below, the DTU forwards to the controller, and the
 * response comes back for us to decode.
 *
 * >>> FILL IN `map` once you have the NL-X16 register table (or after running in
 *     discovery mode and matching logged values to the on-screen numbers). <<<
 */
module.exports = {
  // Which registered Device these readings belong to (create it in the app → Devices).
  deviceId: process.env.DTU_DEVICE_ID || 'NLX16-H1',

  // RS485 / Modbus link (NL-X16 screen showed Baud 115200, Address 0 = broadcast → real ID usually 1)
  slaveId: parseInt(process.env.DTU_SLAVE_ID || '1', 10),
  functionCode: parseInt(process.env.DTU_FUNCTION || '3', 10), // 3 = holding, 4 = input registers

  // One block read per poll cycle: start register + how many to read.
  block: {
    start: parseInt(process.env.DTU_BLOCK_START || '0', 10),
    count: parseInt(process.env.DTU_BLOCK_COUNT || '40', 10),
  },

  pollSeconds: parseInt(process.env.DTU_POLL_SECONDS || '30', 10),

  // Discovery: when true, just log every decoded register so you can match them
  // to the controller screen, then fill `map` and turn this off.
  discovery: process.env.DTU_DISCOVERY === 'true',

  // ---- REGISTER MAP ----  offset = index within the block (start = offset 0)
  // { offset, scale, field, signed }  →  reading[field] = raw * scale
  // EXAMPLE (replace with the real addresses/scaling from ABIS):
  map: [
    // { offset: 0, scale: 0.1, field: 'temperature' },        // Av.T
    // { offset: 1, scale: 0.1, field: 'targetTemperature' },   // Target T
    // { offset: 2, scale: 1,   field: 'humidity' },            // indoor RH
    // { offset: 3, scale: 1,   field: 'ventLevel' },           // Vent. level
    // { offset: 4, scale: 1,   field: 'staticPressure' },      // S.PRESS
    // { offset: 5, scale: 1,   field: 'co2PPM' },              // CO2
    // { offset: 6, scale: 1,   field: 'ammoniaPPM' },          // NH3
    // { offset: 7, scale: 0.01,field: 'airVolume' },           // air volume
    // { offset: 8, scale: 0.1, field: 'outdoorTemp', signed: true },
  ],
};
