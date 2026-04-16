const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { aiRateLimit } = require('../middleware/rateLimit');
const AIInsight = require('../models/AIInsight');
const Batch = require('../models/Batch');
const { analyzeBatch, generateInsights, calculateEnvironmentScore } = require('../services/aiEngine');
const { generateRecommendations } = require('../services/recommendationEngine');

router.use(authenticate);

// GET /api/ai/insights - List insights with filters
router.get('/insights', async (req, res) => {
  try {
    const filter = { isDismissed: false };
    if (req.query.batchId) filter.batch = req.query.batchId;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.severity) filter.severity = req.query.severity;

    const insights = await AIInsight.find(filter)
      .populate('batch', 'batchNumber houseNumber status')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/insights/:batchId - Insights for a specific batch
router.get('/insights/:batchId', async (req, res) => {
  try {
    const insights = await AIInsight.find({
      batch: req.params.batchId,
      isDismissed: false
    }).sort({ createdAt: -1 });

    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/analyze - Trigger manual analysis
router.post('/analyze', aiRateLimit, async (req, res) => {
  try {
    const { batchId, categories } = req.body;

    if (batchId) {
      const analysis = await analyzeBatch(batchId);
      if (!analysis) return res.status(404).json({ error: 'Batch not found or not active' });
      await generateInsights(analysis);
      res.json({ message: 'Analysis complete', analysis });
    } else {
      // Analyze all active batches
      const batches = await Batch.find({ status: 'active' });
      const results = [];
      for (const batch of batches) {
        const analysis = await analyzeBatch(batch._id);
        if (analysis) {
          await generateInsights(analysis);
          results.push(analysis);
        }
      }
      res.json({ message: `Analysis complete for ${results.length} batches`, results });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/recommendations/:batchId - Actionable recommendations
router.get('/recommendations/:batchId', async (req, res) => {
  try {
    const recommendations = await generateRecommendations(req.params.batchId);
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/dashboard - AI summary for main dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const batches = await Batch.find({ status: 'active' });
    const batchMetrics = [];

    for (const batch of batches) {
      const analysis = await analyzeBatch(batch._id);
      if (analysis) {
        batchMetrics.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          houseNumber: batch.houseNumber,
          dayCount: analysis.dayCount,
          phase: analysis.phase,
          diseaseRiskScore: analysis.diseaseRisk.score,
          environmentScore: analysis.environmentScore,
          mortalityPredicted7Day: analysis.mortalityPrediction.totalPredicted,
          mortalityTrend: analysis.mortalityPrediction.currentTrend,
          fcrCurrent: analysis.fcrOptimization?.currentFCR,
          fcrTarget: analysis.fcrOptimization?.targetFCR,
          fcrStatus: analysis.fcrOptimization?.fcrStatus
        });
      }
    }

    // Top recommendations across all batches
    const allRecommendations = [];
    for (const batch of batches) {
      const recs = await generateRecommendations(batch._id);
      allRecommendations.push(...recs.map(r => ({ ...r, batchNumber: batch.batchNumber })));
    }
    allRecommendations.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    });

    // Recent insights
    const recentInsights = await AIInsight.find({ isDismissed: false })
      .populate('batch', 'batchNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      batchMetrics,
      recommendations: allRecommendations.slice(0, 10),
      recentInsights,
      systemHealth: {
        analyzedBatches: batchMetrics.length,
        highRiskBatches: batchMetrics.filter(b => b.diseaseRiskScore > 50).length,
        totalRecommendations: allRecommendations.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ai/insights/:id/dismiss - Dismiss an insight
router.put('/insights/:id/dismiss', async (req, res) => {
  try {
    const insight = await AIInsight.findByIdAndUpdate(
      req.params.id,
      { isDismissed: true },
      { new: true }
    );
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ai/insights/:id/read - Mark insight as read
router.put('/insights/:id/read', async (req, res) => {
  try {
    const insight = await AIInsight.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
