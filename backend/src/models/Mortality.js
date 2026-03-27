const mongoose = require('mongoose');

const mortalitySchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  date: { type: Date, required: true },
  count: { type: Number, required: true, min: 1 },
  cause: { type: String, trim: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Mortality', mortalitySchema);
