const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, unique: true, trim: true },
  chicksArrived: { type: Number, required: true, min: 0 },
  arrivalDate: { type: Date, required: true },
  breed: { type: String, trim: true },
  supplier: { type: String, trim: true },
  costPerChick: { type: Number, default: 0, min: 0 },
  currentCount: { type: Number, min: 0 },
  houseNumber: { type: String, trim: true },
  status: { type: String, enum: ['active', 'sold', 'completed'], default: 'active' },
  notes: { type: String }
}, { timestamps: true });

batchSchema.pre('save', function (next) {
  if (this.isNew && this.currentCount === undefined) {
    this.currentCount = this.chicksArrived;
  }
  next();
});

module.exports = mongoose.model('Batch', batchSchema);
