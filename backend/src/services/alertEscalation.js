const Alert = require('../models/Alert');
const SensorAlert = require('../models/SensorAlert');
const EscalationPolicy = require('../models/EscalationPolicy');
const notificationService = require('./notificationChannels');

const SEVERITY_ORDER = { info: 0, warning: 1, danger: 2, critical: 3 };

function severityMeetsMinimum(alertSeverity, minSeverity) {
  return (SEVERITY_ORDER[alertSeverity] || 0) >= (SEVERITY_ORDER[minSeverity] || 0);
}

function findApplicablePolicy(alert, policies) {
  for (const policy of policies) {
    if (!policy.enabled) continue;
    if (!severityMeetsMinimum(alert.severity, policy.minSeverity)) continue;
    if (policy.alertTypes.length > 0 && !policy.alertTypes.includes(alert.type)) continue;
    return policy;
  }
  return null;
}

async function processEscalations() {
  try {
    const policies = await EscalationPolicy.find({ enabled: true });
    if (policies.length === 0) return;

    // Process batch alerts
    const batchAlerts = await Alert.find({ isResolved: false });
    for (const alert of batchAlerts) {
      await escalateAlert(alert, policies);
    }

    // Process sensor alerts
    const sensorAlerts = await SensorAlert.find({ isResolved: false });
    for (const alert of sensorAlerts) {
      await escalateAlert(alert, policies);
    }

    console.log(`[Alert Escalation] Processed ${batchAlerts.length + sensorAlerts.length} unresolved alerts`);
  } catch (err) {
    console.error('[Alert Escalation] Error:', err.message);
  }
}

async function escalateAlert(alert, policies) {
  const policy = findApplicablePolicy(alert, policies);
  if (!policy) return;

  const minutesSinceCreation = (Date.now() - alert.createdAt) / 60000;
  const currentLevel = alert.data?.escalationLevel || 0;

  for (const level of policy.levels) {
    if (level.level > currentLevel && minutesSinceCreation >= level.delayMinutes) {
      // Execute escalation
      const result = await notificationService.send(
        level.channel,
        level.recipients,
        alert.title,
        alert.message
      );

      // Update alert with escalation info
      const updateData = {
        'data.escalationLevel': level.level,
        'data.lastEscalatedAt': new Date()
      };

      if (!alert.data) alert.data = {};
      if (!alert.data.notificationsSent) alert.data.notificationsSent = [];
      alert.data.notificationsSent.push({
        channel: level.channel,
        sentAt: new Date(),
        level: level.level,
        success: result.sent
      });
      alert.data.escalationLevel = level.level;
      alert.data.lastEscalatedAt = new Date();

      alert.markModified('data');
      await alert.save();
    }
  }
}

function startEscalationChecker() {
  // Check every 2 minutes
  setInterval(() => processEscalations(), 2 * 60 * 1000);
  console.log('[Alert Escalation] Checker started - runs every 2 minutes');
}

module.exports = { processEscalations, startEscalationChecker };
