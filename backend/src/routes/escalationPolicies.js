const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EscalationPolicy = require('../models/EscalationPolicy');

router.use(authenticate);

// GET /api/escalation-policies
router.get('/', async (req, res) => {
  try {
    const policies = await EscalationPolicy.find().sort({ createdAt: -1 });
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/escalation-policies
router.post('/', async (req, res) => {
  try {
    const policy = await EscalationPolicy.create(req.body);
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/escalation-policies/:id
router.put('/:id', async (req, res) => {
  try {
    const policy = await EscalationPolicy.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/escalation-policies/:id
router.delete('/:id', async (req, res) => {
  try {
    const policy = await EscalationPolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
