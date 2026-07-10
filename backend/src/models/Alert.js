const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  type: { type: String, required: true, enum: ['temperature', 'water', 'mortality', 'feed', 'vaccination', 'inventory', 'general', 'sensor', 'ai'] },
  severity: { type: String, required: true, enum: ['info', 'warning', 'danger', 'critical'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Dedup lookups in alertGenerator, unread count, escalation scans, list view
alertSchema.index({ batch: 1, type: 1, isResolved: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ isResolved: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
