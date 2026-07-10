const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Device = require('../models/Device');
const { generateApiKey, getHouseOverview } = require('../services/deviceManager');

router.use(authenticate);

// GET /api/devices - List all devices
router.get('/', async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.houseNumber) filter.houseNumber = req.query.houseNumber;
    if (req.query.status) filter.status = req.query.status;

    const devices = await Device.find(filter)
      .select('-apiKey')
      .sort({ houseNumber: 1, name: 1 });
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/overview - House overview with device and sensor summary
router.get('/overview', async (req, res, next) => {
  try {
    const overview = await getHouseOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:id - Single device details
router.get('/:id', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).select('-apiKey');
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    next(err);
  }
});

// POST /api/devices - Register new device (returns API key once)
router.post('/', async (req, res, next) => {
  try {
    const apiKey = generateApiKey();
    const device = await Device.create({
      ...req.body,
      apiKey,
      registeredBy: req.user.id
    });

    // Return full device with API key - this is the ONLY time the key is returned
    res.status(201).json({
      ...device.toObject(),
      apiKey,
      _warning: 'Save this API key now. It will not be shown again.'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Device ID already exists' });
    }
    next(err);
  }
});

// PUT /api/devices/:id - Update device config
router.put('/:id', async (req, res, next) => {
  try {
    // Don't allow updating apiKey through this route
    const { apiKey, ...updateData } = req.body;

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-apiKey');

    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/devices/:id - Soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-apiKey');

    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ message: 'Device deactivated', device });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/:id/regenerate-key - Generate new API key
router.post('/:id/regenerate-key', async (req, res, next) => {
  try {
    const newApiKey = generateApiKey();
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { apiKey: newApiKey },
      { new: true }
    );

    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({
      apiKey: newApiKey,
      _warning: 'Save this API key now. The old key is now invalid.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
