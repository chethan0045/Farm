const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  apiKey: { type: String, required: true, unique: true },
  houseNumber: { type: String, required: true, trim: true },
  deviceType: { type: String, required: true, enum: ['sensor', 'controller', 'combo'] },
  capabilities: [{
    type: String,
    enum: [
      'temperature', 'humidity', 'ammonia', 'co2', 'light', 'feedLevel', 'waterLevel',
      'relay_fan', 'relay_light', 'relay_heater', 'relay_feeder', 'relay_waterPump'
    ]
  }],
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'offline' },
  lastSeen: { type: Date },
  firmwareVersion: { type: String, trim: true },
  ipAddress: { type: String, trim: true },
  config: {
    reportIntervalSeconds: { type: Number, default: 30 },
    offlineThresholdMinutes: { type: Number, default: 5 }
  },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// apiKey index already created by unique: true
deviceSchema.index({ houseNumber: 1, deviceType: 1 });

module.exports = mongoose.model('Device', deviceSchema);
