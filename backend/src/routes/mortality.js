const express = require('express');
const Mortality = require('../models/Mortality');
const Batch = require('../models/Batch');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { batchId } = req.query;
    const filter = batchId ? { batch: batchId } : {};
    const records = await Mortality.find(filter).populate('batch', 'batchNumber').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const record = await Mortality.create(req.body);
    await Batch.findByIdAndUpdate(req.body.batch, { $inc: { currentCount: -record.count } });
    const populated = await record.populate('batch', 'batchNumber');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const record = await Mortality.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await Batch.findByIdAndUpdate(record.batch, { $inc: { currentCount: record.count } });
    await record.deleteOne();
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
