const express = require('express');
const BatchExpense = require('../models/BatchExpense');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { batchId, category } = req.query;
    const filter = {};
    if (batchId) filter.batch = batchId;
    if (category) filter.category = category;
    const records = await BatchExpense.find(filter).populate('batch', 'batchNumber').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.get('/summary/:batchId', async (req, res, next) => {
  try {
    const summary = await BatchExpense.aggregate([
      { $match: { batch: require('mongoose').Types.ObjectId.createFromHexString(req.params.batchId) } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    const totalExpense = summary.reduce((sum, s) => sum + s.total, 0);
    res.json({ categories: summary, totalExpense });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const record = await BatchExpense.create(req.body);
    const populated = await record.populate('batch', 'batchNumber');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const record = await BatchExpense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('batch', 'batchNumber');
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const record = await BatchExpense.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
