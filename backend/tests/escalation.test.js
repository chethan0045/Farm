const SensorAlert = require('../src/models/SensorAlert');
const EscalationPolicy = require('../src/models/EscalationPolicy');
const { processEscalations } = require('../src/services/alertEscalation');

describe('alert escalation', () => {
  beforeEach(async () => {
    await EscalationPolicy.create({
      name: 'default',
      enabled: true,
      minSeverity: 'warning',
      alertTypes: [],
      levels: [{ level: 1, channel: 'in_app', delayMinutes: 0, recipients: [] }]
    });
  });

  test('escalation state persists on sensor alerts (regression: schema had no data field)', async () => {
    const alert = await SensorAlert.create({
      houseNumber: '1', type: 'temperature', severity: 'critical',
      title: 'Hot', message: 'Very hot'
    });

    await processEscalations();

    const after = await SensorAlert.findById(alert._id);
    expect(after.data).toBeDefined();
    expect(after.data.escalationLevel).toBe(1);
    expect(after.data.notificationsSent).toHaveLength(1);
  });

  test('an already-escalated alert is not re-notified every run', async () => {
    const alert = await SensorAlert.create({
      houseNumber: '1', type: 'temperature', severity: 'critical',
      title: 'Hot', message: 'Very hot'
    });

    await processEscalations();
    await processEscalations();
    await processEscalations();

    const after = await SensorAlert.findById(alert._id);
    // Before the fix this grew by one entry per 2-minute run, forever
    expect(after.data.notificationsSent).toHaveLength(1);
  });

  test('alerts below the policy severity are ignored', async () => {
    const alert = await SensorAlert.create({
      houseNumber: '1', type: 'temperature', severity: 'info',
      title: 'Mild', message: 'Slightly warm'
    });

    await processEscalations();

    const after = await SensorAlert.findById(alert._id);
    expect(after.data?.escalationLevel).toBeUndefined();
  });
});
