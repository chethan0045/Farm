const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  date: { type: Date, required: true },
  type: { type: String, required: true, enum: ['disease', 'treatment', 'observation', 'checkup'] },
  disease: { type: String, trim: true },
  symptoms: { type: String, trim: true },
  medicine: { type: String, trim: true },
  medicineDosage: { type: String, trim: true },
  duration: { type: String, trim: true },
  affectedCount: { type: Number, default: 0, min: 0 },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  vetName: { type: String, trim: true },
  cost: { type: Number, default: 0, min: 0 },
  resolved: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('HealthLog', healthLogSchema);
