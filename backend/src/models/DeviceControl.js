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
    commandId: { type: String },
    relay: { type: String },
    action: { type: Boolean },
    value: { type: Number },
    issuedAt: { type: Date },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    success: { type: Boolean },
    error: { type: String }
  }
}, { timestamps: true });

// An unacked command older than this is considered lost (device offline or
// rebooted) and may be replaced by a new command.
deviceControlSchema.statics.COMMAND_EXPIRY_MS = 5 * 60 * 1000;

// A command is "active" (deliverable, and blocking new commands) only while
// it is unacknowledged and not expired.
deviceControlSchema.statics.isCommandActive = function (pendingCommand) {
  if (!pendingCommand || !pendingCommand.relay || pendingCommand.acknowledged) return false;
  if (!pendingCommand.issuedAt) return false;
  return (Date.now() - new Date(pendingCommand.issuedAt).getTime()) < this.COMMAND_EXPIRY_MS;
};

// Query fragment matching docs whose pending command slot may be overwritten.
deviceControlSchema.statics.commandSlotFree = function () {
  return {
    $or: [
      { 'pendingCommand.relay': { $in: [null, ''] } },
      { 'pendingCommand.relay': { $exists: false } },
      { 'pendingCommand.acknowledged': true },
      { 'pendingCommand.issuedAt': { $lt: new Date(Date.now() - this.COMMAND_EXPIRY_MS) } }
    ]
  };
};

deviceControlSchema.index({ device: 1 }, { unique: true });
deviceControlSchema.index({ houseNumber: 1 });

module.exports = mongoose.model('DeviceControl', deviceControlSchema);
