const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const AutomationRule = require('../models/AutomationRule');
const { evaluateAll, RULE_PRESETS } = require('../services/automationEngine');

router.use(authenticate);

// GET /api/automation-rules - List all rules
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.houseNumber) filter.houseNumber = req.query.houseNumber;
    if (req.query.enabled) filter.enabled = req.query.enabled === 'true';

    const rules = await AutomationRule.find(filter)
      .populate('createdBy', 'username')
      .sort({ priority: -1, createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation-rules/presets - Built-in rule templates
router.get('/presets', async (req, res) => {
  res.json(RULE_PRESETS);
});

// GET /api/automation-rules/:id - Single rule
router.get('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id)
      .populate('createdBy', 'username');
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation-rules - Create rule
router.post('/', async (req, res) => {
  try {
    const rule = await AutomationRule.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/automation-rules/:id - Update rule
router.put('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/automation-rules/:id - Delete rule
router.delete('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/automation-rules/:id/toggle - Enable/disable
router.put('/:id/toggle', async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    rule.enabled = !rule.enabled;
    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/automation-rules/:id/override - Set manual override
router.put('/:id/override', async (req, res) => {
  try {
    const { active, durationMinutes } = req.body;
    const rule = await AutomationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    rule.overrideActive = active !== false;
    rule.overrideUntil = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;
    rule.overrideBy = req.user._id;
    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation-rules/evaluate - Force evaluate all rules now
router.post('/evaluate', async (req, res) => {
  try {
    await evaluateAll();
    res.json({ message: 'Evaluation complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
