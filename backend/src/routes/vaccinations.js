const express = require('express');
const Vaccination = require('../models/Vaccination');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { batchId, status } = req.query;
    const filter = {};
    if (batchId) filter.batch = batchId;
    if (status) filter.status = status;
    const records = await Vaccination.find(filter).populate('batch', 'batchNumber').sort({ scheduledDate: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
    const records = await Vaccination.find({
      status: 'scheduled',
      scheduledDate: { $gte: today, $lte: nextWeek }
    }).populate('batch', 'batchNumber').sort({ scheduledDate: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const record = await Vaccination.create(req.body);
    const populated = await record.populate('batch', 'batchNumber');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await Vaccination.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('batch', 'batchNumber');
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await Vaccination.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
