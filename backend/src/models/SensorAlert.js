const mongoose = require('mongoose');

const sensorAlertSchema = new mongoose.Schema({
  houseNumber: { type: String, required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  type: {
    type: String, required: true,
    enum: ['temperature', 'humidity', 'ammonia', 'co2', 'feedLevel', 'waterLevel', 'deviceOffline', 'automation']
  },
  severity: { type: String, required: true, enum: ['info', 'warning', 'danger', 'critical'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  sensorValue: { type: Number },
  threshold: { type: Number },
  automationRule: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule' },
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

sensorAlertSchema.index({ houseNumber: 1, isResolved: false });
sensorAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SensorAlert', sensorAlertSchema);
