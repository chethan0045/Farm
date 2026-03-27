const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  type: { type: String, enum: ['wholesaler', 'retailer', 'individual', 'other'], default: 'individual' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
