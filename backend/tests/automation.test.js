const AutomationRule = require('../src/models/AutomationRule');
const DeviceControl = require('../src/models/DeviceControl');
const { evaluate } = require('../src/services/automationEngine');
const { createDevice, createBatch } = require('./helpers');

describe('automation engine', () => {
  let device;

  beforeEach(async () => {
    ({ device } = await createDevice({ houseNumber: '1', capabilities: ['temperature', 'relay_fan'] }));
    await createBatch({ houseNumber: '1' });
  });

  const makeRule = (overrides = {}) => AutomationRule.create({
    name: 'Fan on heat',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'temperature', operator: 'gt', value: 32 }],
    action: { type: 'controlRelay', relay: 'fan', relayState: true, relayValue: 80 },
    autoOff: { enabled: true, margin: 2 },
    cooldownMinutes: 1,
    ...overrides
  });

  const ackPending = async () => DeviceControl.updateOne(
    { device: device._id }, { 'pendingCommand.acknowledged': true });

  test('fires the relay when the condition is met and marks the rule engaged', async () => {
    const rule = await makeRule();
    await evaluate('1', { temperature: 35 });

    const control = await DeviceControl.findOne({ device: device._id });
    expect(control.pendingCommand.relay).toBe('fan');
    expect(control.pendingCommand.action).toBe(true);
    expect(control.pendingCommand.commandId).toBeDefined();

    const updated = await AutomationRule.findById(rule._id);
    expect(updated.relayEngaged).toBe(true);
    expect(updated.triggerCount).toBe(1);
  });

  test('does not fire when the condition is not met', async () => {
    await makeRule();
    await evaluate('1', { temperature: 30 });
    expect(await DeviceControl.countDocuments({ device: device._id })).toBe(0);
  });

  test('cooldown suppresses immediate re-trigger', async () => {
    const rule = await makeRule({ cooldownMinutes: 30 });
    await evaluate('1', { temperature: 35 });
    await ackPending();
    await evaluate('1', { temperature: 36 });

    const updated = await AutomationRule.findById(rule._id);
    expect(updated.triggerCount).toBe(1); // second evaluation was inside cooldown
  });

  test('hysteresis: relay released only after clearing by the margin, even in cooldown', async () => {
    const rule = await makeRule({ cooldownMinutes: 60 });
    await evaluate('1', { temperature: 35 });
    await ackPending();

    // 31°C is below the 32° trigger but within the 2° margin — stay on
    await evaluate('1', { temperature: 31 });
    let control = await DeviceControl.findOne({ device: device._id });
    expect(control.pendingCommand.action).toBe(true);
    expect((await AutomationRule.findById(rule._id)).relayEngaged).toBe(true);

    // 29.5°C clears 32 - 2 = 30 — the engine must issue the OFF command
    // despite the 60-minute cooldown still being active
    await evaluate('1', { temperature: 29.5 });
    control = await DeviceControl.findOne({ device: device._id });
    expect(control.pendingCommand.action).toBe(false);
    expect(control.pendingCommand.acknowledged).toBe(false);
    expect((await AutomationRule.findById(rule._id)).relayEngaged).toBe(false);
  });

  test('auto-off retries while the pending-command slot is busy', async () => {
    const rule = await makeRule();
    await evaluate('1', { temperature: 35 });
    // ON command still unacked -> OFF write is blocked, engagement must survive
    await evaluate('1', { temperature: 25 });
    let updated = await AutomationRule.findById(rule._id);
    expect(updated.relayEngaged).toBe(true);

    await ackPending();
    await evaluate('1', { temperature: 25 });
    updated = await AutomationRule.findById(rule._id);
    expect(updated.relayEngaged).toBe(false);
    const control = await DeviceControl.findOne({ device: device._id });
    expect(control.pendingCommand.action).toBe(false);
  });

  test('manual override suspends the rule until it expires', async () => {
    await makeRule({ overrideActive: true, overrideUntil: new Date(Date.now() + 3600000) });
    await evaluate('1', { temperature: 40 });
    expect(await DeviceControl.countDocuments({ device: device._id })).toBe(0);
  });
});
