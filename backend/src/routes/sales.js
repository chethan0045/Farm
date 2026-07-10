const express = require('express');
const Sale = require('../models/Sale');
const Batch = require('../models/Batch');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { batchId, paymentStatus } = req.query;
    const filter = {};
    if (batchId) filter.batch = batchId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const sales = await Sale.find(filter).populate('customer', 'name phone').populate('batch', 'batchNumber').sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    next(err);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const totalSales = await Sale.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } }]);
    const pending = await Sale.countDocuments({ paymentStatus: { $ne: 'paid' } });
    res.json({
      totalSales: totalSales[0]?.total || 0,
      totalPaid: totalSales[0]?.paid || 0,
      totalDue: (totalSales[0]?.total || 0) - (totalSales[0]?.paid || 0),
      pendingCount: pending
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer').populate('batch', 'batchNumber');
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const sale = await Sale.create(req.body);
    // Update bird count if selling birds
    if (req.body.batch && req.body.items) {
      const birdsSold = req.body.items.filter((i) => i.unit === 'birds').reduce((sum, i) => sum + i.quantity, 0);
      if (birdsSold > 0) {
        await Batch.findByIdAndUpdate(req.body.batch, { $inc: { currentCount: -birdsSold } });
      }
    }
    const populated = await sale.populate([{ path: 'customer', select: 'name phone' }, { path: 'batch', select: 'batchNumber' }]);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('customer', 'name phone').populate('batch', 'batchNumber');
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
