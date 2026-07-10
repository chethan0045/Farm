const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Camera = require('../models/Camera');

router.use(authenticate);

// GET /api/cameras - List all cameras
router.get('/', async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.houseNumber) filter.houseNumber = req.query.houseNumber;

    const cameras = await Camera.find(filter).sort({ houseNumber: 1, name: 1 });
    res.json(cameras);
  } catch (err) {
    next(err);
  }
});

// GET /api/cameras/:id - Single camera details
router.get('/:id', async (req, res, next) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ error: 'Camera not found' });
    res.json(camera);
  } catch (err) {
    next(err);
  }
});

// POST /api/cameras - Register a new camera
router.post('/', async (req, res, next) => {
  try {
    const camera = await Camera.create({
      ...req.body,
      registeredBy: req.user.id
    });
    res.status(201).json(camera);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cameras/:id - Update camera
router.put('/:id', async (req, res, next) => {
  try {
    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!camera) return res.status(404).json({ error: 'Camera not found' });
    res.json(camera);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cameras/:id - Soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!camera) return res.status(404).json({ error: 'Camera not found' });
    res.json({ message: 'Camera removed', camera });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
