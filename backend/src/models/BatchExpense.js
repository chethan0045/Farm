const mongoose = require('mongoose');

const batchExpenseSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  date: { type: Date, required: true },
  category: {
    type: String,
    required: true,
    enum: ['electricity', 'diesel', 'medicine', 'water', 'feed', 'labor', 'vaccination', 'equipment', 'transport', 'other']
  },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  quantity: { type: String, trim: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('BatchExpense', batchExpenseSchema);
