const AutomationRule = require('../models/AutomationRule');
const DeviceControl = require('../models/DeviceControl');
const SensorAlert = require('../models/SensorAlert');
const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const Batch = require('../models/Batch');

function evaluateCondition(sensorValue, operator, threshold) {
  if (sensorValue == null) return false;
  switch (operator) {
    case 'gt':  return sensorValue > threshold;
    case 'gte': return sensorValue >= threshold;
    case 'lt':  return sensorValue < threshold;
    case 'lte': return sensorValue <= threshold;
    case 'eq':  return sensorValue === threshold;
    default:    return false;
  }
}

function getSensorValue(sensorName, reading) {
  return reading[sensorName] ?? null;
}

async function checkSustained(houseNumber, condition, seconds) {
  if (!seconds || seconds <= 0) return true;

  const since = new Date(Date.now() - seconds * 1000);
  const recentReadings = await SensorData.find({
    houseNumber,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 }).limit(10).lean();

  if (recentReadings.length === 0) return false;

  return recentReadings.every(r => {
    const val = getSensorValue(condition.sensor, r);
    return evaluateCondition(val, condition.operator, condition.value);
  });
}

async function evaluate(houseNumber, sensorReading) {
  try {
    // Load active rules for this house + global rules
    const rules = await AutomationRule.find({
      enabled: true,
      $or: [
        { houseNumber },
        { houseNumber: null },
        { houseNumber: { $exists: false } },
        { houseNumber: '' }
      ]
    }).sort({ priority: -1 });

    const now = new Date();
    const batch = await Batch.findOne({ houseNumber, status: 'active' });

    for (const rule of rules) {
      // Check manual override
      if (rule.overrideActive && rule.overrideUntil && rule.overrideUntil > now) {
        continue;
      } else if (rule.overrideActive && (!rule.overrideUntil || rule.overrideUntil <= now)) {
        // Override expired, clear it
        rule.overrideActive = false;
        await rule.save();
      }

      // Check cooldown
      if (rule.lastTriggeredAt) {
        const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (now < cooldownEnd) continue;
      }

      // Evaluate conditions
      let conditionsMet;
      if (rule.conditionLogic === 'OR') {
        conditionsMet = false;
        for (const cond of rule.conditions) {
          const val = getSensorValue(cond.sensor, sensorReading);
          if (evaluateCondition(val, cond.operator, cond.value)) {
            if (cond.sustainedSeconds > 0) {
              if (await checkSustained(houseNumber, cond, cond.sustainedSeconds)) {
                conditionsMet = true;
                break;
              }
            } else {
              conditionsMet = true;
              break;
            }
          }
        }
      } else {
        // AND logic
        conditionsMet = true;
        for (const cond of rule.conditions) {
          const val = getSensorValue(cond.sensor, sensorReading);
          if (!evaluateCondition(val, cond.operator, cond.value)) {
            conditionsMet = false;
            break;
          }
          if (cond.sustainedSeconds > 0 && !(await checkSustained(houseNumber, cond, cond.sustainedSeconds))) {
            conditionsMet = false;
            break;
          }
        }
      }

      if (!conditionsMet) continue;

      // Execute actions
      const actionType = rule.action.type;

      if (actionType === 'controlRelay' || actionType === 'both') {
        if (rule.action.relay) {
          const device = await Device.findOne({
            houseNumber,
            isActive: true,
            capabilities: `relay_${rule.action.relay}`
          });

          if (device) {
            await DeviceControl.findOneAndUpdate(
              { device: device._id },
              {
                device: device._id,
                houseNumber,
                [`relays.${rule.action.relay}.state`]: rule.action.relayState !== false,
                ...(rule.action.relayValue != null && rule.action.relay === 'fan'
                  ? { [`relays.fan.speed`]: rule.action.relayValue }
                  : {}),
                ...(rule.action.relayValue != null && rule.action.relay === 'light'
                  ? { [`relays.light.brightness`]: rule.action.relayValue }
                  : {}),
                lastChangedBy: 'automation',
                lastChangedByRule: rule._id,
                pendingCommand: {
                  relay: rule.action.relay,
                  action: rule.action.relayState !== false,
                  value: rule.action.relayValue,
                  issuedAt: now,
                  acknowledged: false
                }
              },
              { upsert: true, new: true }
            );
          }
        }
      }

      if (actionType === 'sendAlert' || actionType === 'both') {
        const alertType = rule.conditions[0]?.sensor === 'temperature' ? 'temperature'
          : rule.conditions[0]?.sensor === 'ammoniaPPM' ? 'ammonia'
          : rule.conditions[0]?.sensor === 'humidity' ? 'humidity'
          : rule.conditions[0]?.sensor === 'co2PPM' ? 'co2'
          : rule.conditions[0]?.sensor === 'feedLevelPercent' ? 'feedLevel'
          : rule.conditions[0]?.sensor === 'waterLevelPercent' ? 'waterLevel'
          : 'automation';

        await SensorAlert.create({
          houseNumber,
          batch: batch?._id,
          type: alertType,
          severity: rule.action.alertSeverity || 'warning',
          title: `Rule Triggered: ${rule.name}`,
          message: rule.action.alertMessage || `Automation rule "${rule.name}" was triggered in house ${houseNumber}.`,
          automationRule: rule._id
        });
      }

      // Update rule trigger info
      rule.lastTriggeredAt = now;
      rule.triggerCount = (rule.triggerCount || 0) + 1;
      await rule.save();
    }
  } catch (err) {
    console.error('[Automation Engine] Error:', err.message);
  }
}

// Evaluate all active houses (scheduled supplement)
async function evaluateAll() {
  try {
    const batches = await Batch.find({ status: 'active' });
    for (const batch of batches) {
      if (!batch.houseNumber) continue;

      const latest = await SensorData.findOne({ houseNumber: batch.houseNumber })
        .sort({ timestamp: -1 }).lean();
      if (latest) {
        await evaluate(batch.houseNumber, latest);
      }
    }
    console.log(`[Automation Engine] Scheduled evaluation complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Automation Engine] Scheduled evaluation error:', err.message);
  }
}

// Default rule presets
const RULE_PRESETS = [
  {
    name: 'High Temperature Alert',
    description: 'Alert when temperature exceeds 32°C',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'temperature', operator: 'gt', value: 32 }],
    action: { type: 'both', relay: 'fan', relayState: true, relayValue: 80, alertSeverity: 'warning', alertMessage: 'High temperature detected. Fan activated.' },
    cooldownMinutes: 30, priority: 5
  },
  {
    name: 'Critical Temperature Emergency',
    description: 'Emergency when temperature exceeds 38°C',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'temperature', operator: 'gt', value: 38 }],
    action: { type: 'both', relay: 'fan', relayState: true, relayValue: 100, alertSeverity: 'critical', alertMessage: 'CRITICAL: Temperature extremely high. All cooling activated.' },
    cooldownMinutes: 15, priority: 10
  },
  {
    name: 'High Ammonia Warning',
    description: 'Alert when ammonia exceeds 25 ppm',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'ammoniaPPM', operator: 'gt', value: 25 }],
    action: { type: 'sendAlert', alertSeverity: 'warning', alertMessage: 'Ammonia levels above safe limit. Increase ventilation.' },
    cooldownMinutes: 60, priority: 5
  },
  {
    name: 'Dangerous Ammonia Emergency',
    description: 'Emergency when ammonia exceeds 50 ppm',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'ammoniaPPM', operator: 'gt', value: 50 }],
    action: { type: 'sendAlert', alertSeverity: 'critical', alertMessage: 'DANGER: Ammonia at toxic levels. Immediate ventilation required.' },
    cooldownMinutes: 15, priority: 10
  },
  {
    name: 'High Humidity Control',
    description: 'Activate exhaust when humidity exceeds 80%',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'humidity', operator: 'gt', value: 80 }],
    action: { type: 'both', relay: 'fan', relayState: true, relayValue: 70, alertSeverity: 'warning', alertMessage: 'High humidity. Exhaust fan activated.' },
    cooldownMinutes: 30, priority: 3
  },
  {
    name: 'Low Feed Level Alert',
    description: 'Alert when feed drops below 20%',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'feedLevelPercent', operator: 'lt', value: 20 }],
    action: { type: 'sendAlert', alertSeverity: 'warning', alertMessage: 'Feed level low. Schedule refill.' },
    cooldownMinutes: 120, priority: 2
  },
  {
    name: 'Low Water Level Alert',
    description: 'Alert when water drops below 20%',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'waterLevelPercent', operator: 'lt', value: 20 }],
    action: { type: 'both', relay: 'waterPump', relayState: true, alertSeverity: 'warning', alertMessage: 'Water level low. Water pump activated.' },
    cooldownMinutes: 60, priority: 4
  }
];

module.exports = { evaluate, evaluateAll, RULE_PRESETS };
