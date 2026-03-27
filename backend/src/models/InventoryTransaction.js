const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  type: { type: String, required: true, enum: ['purchase', 'usage', 'adjustment', 'waste'] },
  quantity: { type: Number, required: true },
  date: { type: Date, required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  cost: { type: Number, default: 0, min: 0 },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
