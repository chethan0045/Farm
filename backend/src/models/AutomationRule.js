const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  houseNumber: { type: String, trim: true }, // null = all houses

  conditionLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  conditions: [{
    sensor: {
      type: String, required: true,
      enum: ['temperature', 'humidity', 'ammoniaPPM', 'co2PPM', 'lightIntensity', 'feedLevelPercent', 'waterLevelPercent']
    },
    operator: { type: String, required: true, enum: ['gt', 'gte', 'lt', 'lte', 'eq'] },
    value: { type: Number, required: true },
    sustainedSeconds: { type: Number, default: 0 }
  }],

  action: {
    type: { type: String, required: true, enum: ['controlRelay', 'sendAlert', 'both'] },
    relay: { type: String, enum: ['fan', 'light', 'heater', 'feeder', 'waterPump'] },
    relayState: { type: Boolean },
    relayValue: { type: Number },
    alertSeverity: { type: String, enum: ['info', 'warning', 'danger', 'critical'] },
    alertMessage: { type: String }
  },

  cooldownMinutes: { type: Number, default: 5, min: 1 },
  lastTriggeredAt: { type: Date },
  triggerCount: { type: Number, default: 0 },

  // Hysteresis: when enabled and this rule has engaged its relay, the engine
  // turns the relay back OFF once the first condition clears by `margin` in
  // the opposite direction (fan ON at >32°C, OFF again at ≤30°C with margin 2).
  // Without this, an ON-only rule leaves equipment running until someone
  // notices, and symmetric ON/OFF rules flap on sensor noise at the threshold.
  autoOff: {
    enabled: { type: Boolean, default: false },
    margin: { type: Number, default: 0, min: 0 }
  },
  relayEngaged: { type: Boolean, default: false },

  overrideActive: { type: Boolean, default: false },
  overrideUntil: { type: Date },
  overrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  priority: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
