const express = require('express');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');
const { generateAlerts } = require('../services/alertGenerator');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { isRead } = req.query;
    const filter = {};
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    const alerts = await Alert.find(filter).populate('batch', 'batchNumber').sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// Generate alerts based on current data (delegates to the shared scanner —
// this previously duplicated ~90 lines of alertGenerator.js that had drifted)
router.post('/generate', async (req, res, next) => {
  try {
    const newAlerts = await generateAlerts();
    res.json({ generated: newAlerts.length, alerts: newAlerts });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/resolve', async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isResolved: true, isRead: true }, { new: true });
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
