const mongoose = require('mongoose');

// Generic farm-wide key/value settings (single-tenant). Each key holds one
// config section, e.g. key 'abis' -> the ABIS NL-X16 bridge configuration.
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
