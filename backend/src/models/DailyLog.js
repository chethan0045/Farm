const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  date: { type: Date, required: true },
  dayNumber: { type: Number, required: true, min: 1 },

  // Feed & Water
  feedGivenKg: { type: Number, default: 0, min: 0 },
  waterGivenLiters: { type: Number, default: 0, min: 0 },

  // Body Weight (sample weight in grams)
  avgBodyWeightGrams: { type: Number, min: 0 },
  sampleSize: { type: Number, min: 0 },

  // EC Shed Environment
  temperature: { type: Number },
  humidity: { type: Number },
  ammonia: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  ammoniaPPM: { type: Number },
  co2PPM: { type: Number },
  ventilation: { type: String, enum: ['good', 'moderate', 'poor'], default: 'good' },
  lightHours: { type: Number, min: 0, max: 24 },

  // Mortality for the day
  mortalityCount: { type: Number, default: 0, min: 0 },
  mortalityCause: { type: String },

  notes: { type: String }
}, { timestamps: true });

dailyLogSchema.index({ batch: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
