const mongoose = require('mongoose');

const deviceControlSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  houseNumber: { type: String, required: true, trim: true },

  relays: {
    fan: { state: { type: Boolean, default: false }, speed: { type: Number, min: 0, max: 100, default: 0 } },
    light: { state: { type: Boolean, default: false }, brightness: { type: Number, min: 0, max: 100, default: 0 } },
    heater: { state: { type: Boolean, default: false } },
    feeder: { state: { type: Boolean, default: false } },
    waterPump: { state: { type: Boolean, default: false } }
  },

  lastChangedBy: { type: String, enum: ['manual', 'automation', 'schedule'], default: 'manual' },
  lastChangedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastChangedByRule: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule' },

  pendingCommand: {
    relay: { type: String },
    action: { type: Boolean },
    value: { type: Number },
    issuedAt: { type: Date },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date }
  }
}, { timestamps: true });

deviceControlSchema.index({ device: 1 }, { unique: true });
deviceControlSchema.index({ houseNumber: 1 });

module.exports = mongoose.model('DeviceControl', deviceControlSchema);
