const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  date: { type: Date, required: true },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'birds' },
    pricePerUnit: { type: Number, required: true, min: 0 },
    weight: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'pending'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank', 'cheque', 'other'], default: 'cash' },
  notes: { type: String }
}, { timestamps: true });

saleSchema.pre('save', function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
