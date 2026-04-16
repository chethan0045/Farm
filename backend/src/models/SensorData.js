const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  houseNumber: { type: String, required: true, trim: true },
  timestamp: { type: Date, required: true, default: Date.now },

  temperature: { type: Number },
  humidity: { type: Number },
  ammoniaPPM: { type: Number },
  co2PPM: { type: Number },
  lightIntensity: { type: Number },
  feedLevelPercent: { type: Number },
  waterLevelPercent: { type: Number },

  rssi: { type: Number },
  freeHeapBytes: { type: Number }
}, { timestamps: false });

// Auto-delete raw data after 90 days
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
sensorDataSchema.index({ houseNumber: 1, timestamp: -1 });
sensorDataSchema.index({ device: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
