const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['income', 'expense'] },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);
