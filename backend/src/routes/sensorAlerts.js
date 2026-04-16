const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SensorAlert = require('../models/SensorAlert');

router.use(authenticate);

// GET /api/sensor-alerts - List sensor alerts
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.houseNumber) filter.houseNumber = req.query.houseNumber;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.isResolved !== undefined) filter.isResolved = req.query.isResolved === 'true';

    const alerts = await SensorAlert.find(filter)
      .populate('device', 'deviceId name')
      .populate('batch', 'batchNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50);

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-alerts/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await SensorAlert.countDocuments({ isRead: false, isResolved: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sensor-alerts/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const alert = await SensorAlert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sensor-alerts/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await SensorAlert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedAt: new Date(), resolvedBy: req.user._id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sensor-alerts/read-all
router.put('/read-all', async (req, res) => {
  try {
    await SensorAlert.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All sensor alerts marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
