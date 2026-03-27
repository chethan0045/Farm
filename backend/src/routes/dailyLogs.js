const express = require('express');
const DailyLog = require('../models/DailyLog');
const Batch = require('../models/Batch');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get logs (optionally filter by batch)
router.get('/', async (req, res) => {
  try {
    const { batchId } = req.query;
    const filter = batchId ? { batch: batchId } : {};
    const logs = await DailyLog.find(filter).populate('batch', 'batchNumber chicksArrived currentCount arrivalDate').sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest log for a batch
router.get('/latest/:batchId', async (req, res) => {
  try {
    const log = await DailyLog.findOne({ batch: req.params.batchId }).sort({ date: -1 }).populate('batch', 'batchNumber chicksArrived currentCount arrivalDate');
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get analytics for a batch (FCR, avg feed/water per bird, growth trend)
router.get('/analytics/:batchId', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const logs = await DailyLog.find({ batch: req.params.batchId }).sort({ date: 1 });

    const totalFeedKg = logs.reduce((sum, l) => sum + (l.feedGivenKg || 0), 0);
    const totalWaterLiters = logs.reduce((sum, l) => sum + (l.waterGivenLiters || 0), 0);
    const totalMortality = logs.reduce((sum, l) => sum + (l.mortalityCount || 0), 0);

    // Get latest body weight
    const latestWithWeight = [...logs].reverse().find(l => l.avgBodyWeightGrams > 0);
    const latestWeightGrams = latestWithWeight?.avgBodyWeightGrams || 0;

    // FCR = Total Feed (kg) / (Total Live Weight Gain in kg)
    // Live weight gain = current birds * avg weight - initial weight (assume 40g per chick)
    const initialWeightKg = (batch.chicksArrived * 40) / 1000;
    const currentWeightKg = ((batch.currentCount || 0) * latestWeightGrams) / 1000;
    const weightGainKg = currentWeightKg - initialWeightKg;
    const fcr = weightGainKg > 0 ? (totalFeedKg / weightGainKg).toFixed(2) : 0;

    // Feed per bird per day (avg)
    const activeDays = logs.length || 1;
    const avgBirds = (batch.chicksArrived + (batch.currentCount || 0)) / 2;
    const feedPerBirdPerDay = avgBirds > 0 ? ((totalFeedKg * 1000) / (avgBirds * activeDays)).toFixed(1) : 0;
    const waterPerBirdPerDay = avgBirds > 0 ? ((totalWaterLiters * 1000) / (avgBirds * activeDays)).toFixed(1) : 0;

    // Water to feed ratio
    const waterFeedRatio = totalFeedKg > 0 ? (totalWaterLiters / totalFeedKg).toFixed(2) : 0;

    // Growth trend (weight over days)
    const growthTrend = logs.filter(l => l.avgBodyWeightGrams > 0).map(l => ({
      day: l.dayNumber,
      date: l.date,
      weight: l.avgBodyWeightGrams
    }));

    // Feed trend
    const feedTrend = logs.map(l => ({
      day: l.dayNumber,
      date: l.date,
      feed: l.feedGivenKg,
      water: l.waterGivenLiters
    }));

    // Environment trend
    const envTrend = logs.filter(l => l.temperature != null).map(l => ({
      day: l.dayNumber,
      date: l.date,
      temperature: l.temperature,
      humidity: l.humidity
    }));

    res.json({
      batchNumber: batch.batchNumber,
      dayCount: batch.dayCount,
      phase: batch.phase,
      totalFeedKg,
      totalWaterLiters,
      totalMortality,
      mortalityPercent: batch.mortalityPercent,
      latestWeightGrams,
      fcr: parseFloat(fcr),
      feedPerBirdPerDay: parseFloat(feedPerBirdPerDay),
      waterPerBirdPerDay: parseFloat(waterPerBirdPerDay),
      waterFeedRatio: parseFloat(waterFeedRatio),
      growthTrend,
      feedTrend,
      envTrend,
      totalLogs: logs.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create daily log
router.post('/', async (req, res) => {
  try {
    const batch = await Batch.findById(req.body.batch);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    // Auto-calculate day number
    const arrival = new Date(batch.arrivalDate);
    const logDate = new Date(req.body.date);
    const dayNumber = Math.floor((logDate - arrival) / (1000 * 60 * 60 * 24)) + 1;

    const logData = { ...req.body, dayNumber };
    const log = await DailyLog.create(logData);

    // Update mortality in batch if any
    if (log.mortalityCount > 0) {
      await Batch.findByIdAndUpdate(req.body.batch, { $inc: { currentCount: -log.mortalityCount } });
    }

    const populated = await log.populate('batch', 'batchNumber chicksArrived currentCount arrivalDate');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A log for this batch and date already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update daily log
router.put('/:id', async (req, res) => {
  try {
    const existing = await DailyLog.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Log not found' });

    // Adjust mortality difference
    const mortalityDiff = (req.body.mortalityCount || 0) - (existing.mortalityCount || 0);
    if (mortalityDiff !== 0) {
      await Batch.findByIdAndUpdate(existing.batch, { $inc: { currentCount: -mortalityDiff } });
    }

    const log = await DailyLog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('batch', 'batchNumber chicksArrived currentCount arrivalDate');
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete daily log
router.delete('/:id', async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });

    // Restore mortality
    if (log.mortalityCount > 0) {
      await Batch.findByIdAndUpdate(log.batch, { $inc: { currentCount: log.mortalityCount } });
    }

    await log.deleteOne();
    res.json({ message: 'Log deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
