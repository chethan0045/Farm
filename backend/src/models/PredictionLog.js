const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  type: { type: String, required: true, enum: ['mortality', 'weight', 'fcr', 'disease_risk'] },
  predictedDate: { type: Date, required: true },
  predictedValue: { type: Number, required: true },
  actualValue: { type: Number },
  accuracy: { type: Number },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

predictionLogSchema.index({ batch: 1, type: 1, predictedDate: 1 });

module.exports = mongoose.model('PredictionLog', predictionLogSchema);
