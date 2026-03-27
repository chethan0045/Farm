const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  type: { type: String, required: true, enum: ['temperature', 'water', 'mortality', 'feed', 'vaccination', 'inventory', 'general'] },
  severity: { type: String, required: true, enum: ['info', 'warning', 'danger', 'critical'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
