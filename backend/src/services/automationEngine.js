const crypto = require('crypto');
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

// knownBatch: pass the already-loaded active batch (or null) to skip the
// lookup — the sensor ingest path resolves it right before calling this.
async function evaluate(houseNumber, sensorReading, knownBatch) {
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
    const batch = knownBatch !== undefined
      ? knownBatch
      : await Batch.findOne({ houseNumber, status: 'active' });

    for (const rule of rules) {
      // Check manual override
      if (rule.overrideActive && rule.overrideUntil && rule.overrideUntil > now) {
        continue;
      } else if (rule.overrideActive && (!rule.overrideUntil || rule.overrideUntil <= now)) {
        // Override expired, clear it
        rule.overrideActive = false;
        await rule.save();
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

      if (!conditionsMet) {
        // Hysteresis: release an engaged relay once the condition has cleared
        // by the configured margin. Runs even during cooldown — cooldown
        // throttles re-triggering, it must never keep equipment running.
        await maybeAutoOff(rule, houseNumber, sensorReading);
        continue;
      }

      // Check cooldown (after condition evaluation so auto-off above still runs)
      if (rule.lastTriggeredAt) {
        const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (now < cooldownEnd) continue;
      }

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
            // Don't stomp an unacked command (e.g. a manual one) that hasn't
            // expired yet — the duplicate-key error from the upsert against
            // the slot-free filter signals the slot is busy; skip this cycle,
            // the rule will retry on the next reading.
            try {
              await DeviceControl.findOneAndUpdate(
                { device: device._id, ...DeviceControl.commandSlotFree() },
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
                    commandId: crypto.randomBytes(8).toString('hex'),
                    relay: rule.action.relay,
                    action: rule.action.relayState !== false,
                    value: rule.action.relayValue,
                    issuedAt: now,
                    acknowledged: false
                  }
                },
                { upsert: true, new: true }
              );
              // Remember the relay is ours to release when the condition clears
              if (rule.action.relayState !== false) rule.relayEngaged = true;
            } catch (err) {
              if (err.code === 11000) {
                console.log(`[Automation Engine] Rule "${rule.name}": device ${device.deviceId || device._id} has an unacked pending command, skipping relay write`);
                continue;
              }
              throw err;
            }
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

// Turn a rule's relay back OFF once its first condition has cleared by the
// configured margin (hysteresis). relayEngaged stays true if the OFF command
// can't be written yet (pending-command slot busy) so it retries next reading.
async function maybeAutoOff(rule, houseNumber, reading) {
  if (!rule.autoOff?.enabled || !rule.relayEngaged) return;
  if (!rule.action?.relay || rule.action.relayState === false) return;

  const cond = rule.conditions[0];
  if (!cond) return;
  const val = getSensorValue(cond.sensor, reading);
  if (val == null) return;

  const margin = rule.autoOff.margin || 0;
  let cleared = false;
  switch (cond.operator) {
    case 'gt': case 'gte': cleared = val <= cond.value - margin; break;
    case 'lt': case 'lte': cleared = val >= cond.value + margin; break;
    default: return; // 'eq' has no clearing direction
  }
  if (!cleared) return;

  const device = await Device.findOne({
    houseNumber,
    isActive: true,
    capabilities: `relay_${rule.action.relay}`
  });
  if (!device) return;

  try {
    await DeviceControl.findOneAndUpdate(
      { device: device._id, ...DeviceControl.commandSlotFree() },
      {
        device: device._id,
        houseNumber,
        [`relays.${rule.action.relay}.state`]: false,
        lastChangedBy: 'automation',
        lastChangedByRule: rule._id,
        pendingCommand: {
          commandId: crypto.randomBytes(8).toString('hex'),
          relay: rule.action.relay,
          action: false,
          value: null,
          issuedAt: new Date(),
          acknowledged: false
        }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    if (err.code === 11000) return; // slot busy — retry on the next reading
    throw err;
  }

  rule.relayEngaged = false;
  await rule.save();
  console.log(`[Automation Engine] Rule "${rule.name}": condition cleared, ${rule.action.relay} auto-off issued for house ${houseNumber}`);
}

// Evaluate all active houses (scheduled supplement).
// Only readings fresh enough to reflect current conditions are evaluated —
// firing relays off a reading from a sensor that died hours ago is worse
// than doing nothing.
const SUPPLEMENT_MAX_READING_AGE_MS = 15 * 60 * 1000;

async function evaluateAll() {
  try {
    const batches = await Batch.find({ status: 'active' });
    for (const batch of batches) {
      if (!batch.houseNumber) continue;

      const latest = await SensorData.findOne({ houseNumber: batch.houseNumber })
        .sort({ timestamp: -1 }).lean();
      if (latest && (Date.now() - new Date(latest.timestamp).getTime()) < SUPPLEMENT_MAX_READING_AGE_MS) {
        await evaluate(batch.houseNumber, latest, batch);
      }
    }
    console.log(`[Automation Engine] Scheduled evaluation complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Automation Engine] Scheduled evaluation error:', err.message);
  }
}

// Supplement pass so rules with cooldowns or sustained conditions still
// re-fire between sensor POSTs. The isRunning guard prevents overlap if a
// pass outlives the interval.
let evaluateAllRunning = false;
function startAutomationScheduler() {
  const intervalMin = parseInt(process.env.AUTOMATION_EVAL_INTERVAL_MIN) || 5;
  setInterval(async () => {
    if (evaluateAllRunning) return;
    evaluateAllRunning = true;
    try {
      await evaluateAll();
    } finally {
      evaluateAllRunning = false;
    }
  }, intervalMin * 60 * 1000);
  console.log(`[Automation Engine] Supplement scheduler started - runs every ${intervalMin} minutes`);
}

// Default rule presets
const RULE_PRESETS = [
  {
    name: 'High Temperature Alert',
    description: 'Alert when temperature exceeds 32°C',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'temperature', operator: 'gt', value: 32 }],
    action: { type: 'both', relay: 'fan', relayState: true, relayValue: 80, alertSeverity: 'warning', alertMessage: 'High temperature detected. Fan activated.' },
    autoOff: { enabled: true, margin: 2 },
    cooldownMinutes: 30, priority: 5
  },
  {
    name: 'Critical Temperature Emergency',
    description: 'Emergency when temperature exceeds 38°C',
    conditionLogic: 'AND',
    conditions: [{ sensor: 'temperature', operator: 'gt', value: 38 }],
    action: { type: 'both', relay: 'fan', relayState: true, relayValue: 100, alertSeverity: 'critical', alertMessage: 'CRITICAL: Temperature extremely high. All cooling activated.' },
    autoOff: { enabled: true, margin: 2 },
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
    autoOff: { enabled: true, margin: 5 },
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
    autoOff: { enabled: true, margin: 40 }, // pump off once tank refills past 60%
    cooldownMinutes: 60, priority: 4
  }
];

module.exports = { evaluate, evaluateAll, startAutomationScheduler, RULE_PRESETS };
