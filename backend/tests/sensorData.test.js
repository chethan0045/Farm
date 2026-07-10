const request = require('supertest');
const app = require('../src/app');
const SensorData = require('../src/models/SensorData');
const SensorAlert = require('../src/models/SensorAlert');
const DeviceControl = require('../src/models/DeviceControl');
const { createDevice, createBatch } = require('./helpers');

describe('sensor ingest', () => {
  let device, apiKey;

  beforeEach(async () => {
    ({ device, apiKey } = await createDevice({ houseNumber: '1' }));
    await createBatch({ houseNumber: '1' });
  });

  const post = (body) =>
    request(app).post('/api/sensor-data').set('X-API-Key', apiKey).send(body);

  test('persists the reading and creates a threshold alert once (30min dedup)', async () => {
    const first = await post({ temperature: 45, humidity: 60 });
    expect(first.status).toBe(200);
    expect(await SensorData.countDocuments()).toBe(1);
    expect(await SensorAlert.countDocuments({ type: 'temperature' })).toBe(1);

    await post({ temperature: 45, humidity: 60 });
    // Second identical breach within 30 minutes must not duplicate the alert
    expect(await SensorAlert.countDocuments({ type: 'temperature' })).toBe(1);
  });

  test('piggybacks the pending command (with commandId) on the POST response', async () => {
    await DeviceControl.create({
      device: device._id,
      houseNumber: '1',
      pendingCommand: { commandId: 'abc123abc123abc1', relay: 'fan', action: true, issuedAt: new Date(), acknowledged: false }
    });
    const res = await post({ temperature: 25 });
    expect(res.body.pendingCommand).toMatchObject({ commandId: 'abc123abc123abc1', relay: 'fan', action: true });
  });

  test('bulk: stale buffered readings are persisted but do not fire alerts', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const res = await request(app).post('/api/sensor-data/bulk').set('X-API-Key', apiKey)
      .send({ readings: [
        { temperature: 45, timestamp: twoHoursAgo },
        { temperature: 46, timestamp: twoHoursAgo }
      ] });
    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(2);
    expect(await SensorData.countDocuments()).toBe(2);
    // Hours-old heat spike must not raise a live alert now
    expect(await SensorAlert.countDocuments()).toBe(0);
  });

  test('bulk: a fresh reading in the batch still drives alerts', async () => {
    const res = await request(app).post('/api/sensor-data/bulk').set('X-API-Key', apiKey)
      .send({ readings: [
        { temperature: 45, timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
        { temperature: 45, timestamp: new Date().toISOString() }
      ] });
    expect(res.status).toBe(200);
    expect(await SensorAlert.countDocuments({ type: 'temperature' })).toBe(1);
  });

  test('rejects a missing API key', async () => {
    const res = await request(app).post('/api/sensor-data').send({ temperature: 25 });
    expect(res.status).toBe(401);
  });
});
