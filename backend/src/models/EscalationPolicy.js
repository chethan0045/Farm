const mongoose = require('mongoose');

const escalationPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  levels: [{
    level: { type: Number, required: true },
    channel: { type: String, required: true, enum: ['in_app', 'push', 'sms', 'whatsapp', 'email'] },
    delayMinutes: { type: Number, required: true },
    recipients: [{ type: String }]
  }],
  alertTypes: [{ type: String }],
  minSeverity: { type: String, enum: ['info', 'warning', 'danger', 'critical'], default: 'warning' },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EscalationPolicy', escalationPolicySchema);
