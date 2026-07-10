const request = require('supertest');
const app = require('../src/app');
const DeviceControl = require('../src/models/DeviceControl');
const { createUserWithToken, createDevice } = require('./helpers');

describe('device command protocol', () => {
  let token, device, apiKey;

  beforeEach(async () => {
    ({ token } = await createUserWithToken());
    ({ device, apiKey } = await createDevice());
  });

  const sendCommand = (body = { relay: 'fan', action: true, value: 80 }) =>
    request(app).post('/api/device-control/command')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: device._id.toString(), ...body });

  test('command gets a commandId and lands in the pending slot', async () => {
    const res = await sendCommand();
    expect(res.status).toBe(200);
    expect(res.body.control.pendingCommand.commandId).toMatch(/^[0-9a-f]{16}$/);
    expect(res.body.control.pendingCommand.acknowledged).toBe(false);
  });

  test('second command is rejected (409) while the first is unacknowledged', async () => {
    await sendCommand();
    const res = await sendCommand({ relay: 'waterPump', action: true });
    expect(res.status).toBe(409);
    // Original command must be intact
    const control = await DeviceControl.findOne({ device: device._id });
    expect(control.pendingCommand.relay).toBe('fan');
  });

  test('ack with a stale commandId is rejected; matching id clears the slot', async () => {
    const sent = await sendCommand();
    const commandId = sent.body.control.pendingCommand.commandId;

    const wrong = await request(app).post('/api/device-control/ack')
      .set('X-API-Key', apiKey)
      .send({ commandId: 'deadbeefdeadbeef', success: true });
    expect(wrong.status).toBe(409);

    const right = await request(app).post('/api/device-control/ack')
      .set('X-API-Key', apiKey)
      .send({ commandId, success: true });
    expect(right.status).toBe(200);

    // Slot is now free: a new command is accepted
    const next = await sendCommand({ relay: 'waterPump', action: true });
    expect(next.status).toBe(200);
    expect(next.body.control.pendingCommand.relay).toBe('waterPump');
  });

  test('poll delivers commandId and goes quiet after ack', async () => {
    const sent = await sendCommand();
    const commandId = sent.body.control.pendingCommand.commandId;

    const poll = await request(app).get('/api/device-control/poll').set('X-API-Key', apiKey);
    expect(poll.body.hasPendingCommand).toBe(true);
    expect(poll.body.command.commandId).toBe(commandId);

    await request(app).post('/api/device-control/ack')
      .set('X-API-Key', apiKey).send({ commandId, success: true });

    const after = await request(app).get('/api/device-control/poll').set('X-API-Key', apiKey);
    expect(after.body.hasPendingCommand).toBe(false);
  });

  test('an expired unacked command is not delivered and can be replaced', async () => {
    await sendCommand();
    await DeviceControl.updateOne(
      { device: device._id },
      { 'pendingCommand.issuedAt': new Date(Date.now() - 10 * 60 * 1000) }
    );
    const poll = await request(app).get('/api/device-control/poll').set('X-API-Key', apiKey);
    expect(poll.body.hasPendingCommand).toBe(false);

    const res = await sendCommand({ relay: 'waterPump', action: false });
    expect(res.status).toBe(200);
  });
});
