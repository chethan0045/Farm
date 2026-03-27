const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['feed', 'medicine', 'vaccine', 'equipment', 'supplement', 'other'] },
  currentStock: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  minStockLevel: { type: Number, default: 0, min: 0 },
  costPerUnit: { type: Number, default: 0, min: 0 },
  supplier: { type: String, trim: true },
  expiryDate: { type: Date },
  location: { type: String, trim: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
