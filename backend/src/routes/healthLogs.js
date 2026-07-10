const express = require('express');
const HealthLog = require('../models/HealthLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { batchId, type } = req.query;
    const filter = {};
    if (batchId) filter.batch = batchId;
    if (type) filter.type = type;
    const records = await HealthLog.find(filter).populate('batch', 'batchNumber').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const record = await HealthLog.create(req.body);
    const populated = await record.populate('batch', 'batchNumber');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const record = await HealthLog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('batch', 'batchNumber');
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const record = await HealthLog.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
