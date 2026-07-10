const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../src/models/User');
const Device = require('../src/models/Device');
const Batch = require('../src/models/Batch');

async function createUserWithToken(overrides = {}) {
  const user = await User.create({
    username: overrides.username || 'tester',
    email: overrides.email || 'tester@example.com',
    password: overrides.password || 'secret123',
    ...overrides
  });
  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { user, token };
}

async function createDevice(overrides = {}) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const device = await Device.create({
    deviceId: overrides.deviceId || `ESP-${crypto.randomBytes(4).toString('hex')}`,
    name: overrides.name || 'Test Node',
    apiKey,
    houseNumber: overrides.houseNumber || '1',
    deviceType: overrides.deviceType || 'combo',
    capabilities: overrides.capabilities || ['temperature', 'humidity', 'relay_fan', 'relay_waterPump'],
    ...overrides
  });
  return { device, apiKey };
}

async function createBatch(overrides = {}) {
  return Batch.create({
    batchNumber: overrides.batchNumber || `B-${crypto.randomBytes(3).toString('hex')}`,
    chicksArrived: overrides.chicksArrived ?? 1000,
    arrivalDate: overrides.arrivalDate || new Date(Date.now() - 10 * 86400000),
    houseNumber: overrides.houseNumber || '1',
    status: 'active',
    ...overrides
  });
}

module.exports = { createUserWithToken, createDevice, createBatch };
