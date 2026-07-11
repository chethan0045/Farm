const express = require('express');
const Setting = require('../models/Setting');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { authenticateDevice } = require('../middleware/deviceAuth');

const router = express.Router();

const KEY_RE = /^[a-zA-Z][\w-]{0,40}$/;

// GET /api/settings/bridge/abis - the Pi bridge pulls its remote config with
// its device API key (same credential it already uses to upload readings).
// Registered BEFORE the JWT routes so it isn't shadowed by GET /:key.
router.get('/bridge/abis', authenticateDevice, async (req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: 'abis' }).lean();
    res.json(doc ? doc.value : {});
  } catch (err) {
    next(err);
  }
});

// GET /api/settings - all settings as { key: value }
router.get('/', authenticate, async (req, res, next) => {
  try {
    const docs = await Setting.find().lean();
    const out = {};
    for (const d of docs) out[d.key] = d.value;
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/:key - one section
router.get('/:key', authenticate, async (req, res, next) => {
  try {
    if (!KEY_RE.test(req.params.key)) return res.status(400).json({ error: 'Invalid settings key' });
    const doc = await Setting.findOne({ key: req.params.key }).lean();
    res.json(doc ? doc.value : null);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key - upsert one section (admin only)
router.put('/:key', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!KEY_RE.test(req.params.key)) return res.status(400).json({ error: 'Invalid settings key' });
    if (req.body === undefined || req.body.value === undefined) {
      return res.status(400).json({ error: 'Body must be { value: ... }' });
    }
    const doc = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value, updatedBy: req.user.username },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json(doc.value);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
