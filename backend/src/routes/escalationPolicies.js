const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EscalationPolicy = require('../models/EscalationPolicy');

router.use(authenticate);

// GET /api/escalation-policies
router.get('/', async (req, res, next) => {
  try {
    const policies = await EscalationPolicy.find().sort({ createdAt: -1 });
    res.json(policies);
  } catch (err) {
    next(err);
  }
});

// POST /api/escalation-policies
router.post('/', async (req, res, next) => {
  try {
    const policy = await EscalationPolicy.create(req.body);
    res.status(201).json(policy);
  } catch (err) {
    next(err);
  }
});

// PUT /api/escalation-policies/:id
router.put('/:id', async (req, res, next) => {
  try {
    const policy = await EscalationPolicy.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/escalation-policies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const policy = await EscalationPolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
