const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, unique: true, trim: true },
  chicksArrived: { type: Number, required: true, min: 0 },
  arrivalDate: { type: Date, required: true },
  breed: { type: String, trim: true },
  birdType: { type: String, enum: ['broiler', 'layer', 'other'], default: 'broiler' },
  supplier: { type: String, trim: true },
  costPerChick: { type: Number, min: 0 },
  currentCount: { type: Number, min: 0 },
  houseNumber: { type: String, trim: true },
  shedType: { type: String, enum: ['ec', 'open', 'semi'], default: 'ec' },
  status: { type: String, enum: ['active', 'sold', 'completed'], default: 'active' },
  notes: { type: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

batchSchema.pre('save', function (next) {
  if (this.isNew && this.currentCount === undefined) {
    this.currentCount = this.chicksArrived;
  }
  next();
});

// Virtual: day count since arrival
batchSchema.virtual('dayCount').get(function () {
  if (!this.arrivalDate) return 0;
  const now = new Date();
  const arrival = new Date(this.arrivalDate);
  return Math.floor((now - arrival) / (1000 * 60 * 60 * 24)) + 1;
});

// Virtual: current phase
batchSchema.virtual('phase').get(function () {
  const day = this.dayCount;
  if (day <= 10) return 'starter';
  if (day <= 24) return 'grower';
  if (day <= 42) return 'finisher';
  return 'mature';
});

// Virtual: mortality percentage
batchSchema.virtual('mortalityPercent').get(function () {
  if (!this.chicksArrived || this.chicksArrived === 0) return 0;
  const dead = this.chicksArrived - (this.currentCount || 0);
  return ((dead / this.chicksArrived) * 100).toFixed(2);
});

module.exports = mongoose.model('Batch', batchSchema);
