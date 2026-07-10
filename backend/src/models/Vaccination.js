const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  vaccineName: { type: String, required: true, trim: true },
  scheduledDate: { type: Date, required: true },
  administeredDate: { type: Date },
  dayNumber: { type: Number },
  dosage: { type: String, trim: true },
  method: { type: String, enum: ['drinking_water', 'eye_drop', 'injection', 'spray', 'other'], default: 'drinking_water' },
  status: { type: String, enum: ['scheduled', 'completed', 'missed', 'postponed'], default: 'scheduled' },
  administeredBy: { type: String, trim: true },
  cost: { type: Number, default: 0, min: 0 },
  notes: { type: String }
}, { timestamps: true });

// Due-vaccine scans (alertGenerator hourly) and per-batch upcoming lookups
vaccinationSchema.index({ status: 1, scheduledDate: 1 });
vaccinationSchema.index({ batch: 1, status: 1, scheduledDate: 1 });

module.exports = mongoose.model('Vaccination', vaccinationSchema);
