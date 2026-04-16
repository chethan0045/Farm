const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  houseNumber: { type: String, trim: true },
  category: {
    type: String, required: true,
    enum: ['disease_risk', 'mortality_prediction', 'fcr_optimization', 'environment_optimization', 'feed_recommendation', 'general']
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  details: { type: String },
  recommendations: [{ type: String }],
  confidence: { type: Number, min: 0, max: 100 },

  inputData: {
    sensorAverages: { type: mongoose.Schema.Types.Mixed },
    batchMetrics: { type: mongoose.Schema.Types.Mixed },
    historicalComparison: { type: mongoose.Schema.Types.Mixed }
  },

  isRead: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false },
  expiresAt: { type: Date },
  generatedBy: { type: String, enum: ['rule_engine', 'ml_model', 'trend_analysis'], default: 'rule_engine' }
}, { timestamps: true });

aiInsightSchema.index({ batch: 1, category: 1 });
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
