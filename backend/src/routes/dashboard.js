const express = require('express');
const Batch = require('../models/Batch');
const Mortality = require('../models/Mortality');
const BatchExpense = require('../models/BatchExpense');
const Finance = require('../models/Finance');
const DailyLog = require('../models/DailyLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const activeBatches = await Batch.find({ status: 'active' }).sort({ createdAt: -1 });

    const totalBirdsAlive = activeBatches.reduce((sum, b) => sum + (b.currentCount || 0), 0);
    const totalChicksArrived = activeBatches.reduce((sum, b) => sum + b.chicksArrived, 0);

    const totalMortality = await Mortality.aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    // Daily log mortality too
    const dailyLogMortality = await DailyLog.aggregate([
      { $group: { _id: null, total: { $sum: '$mortalityCount' } } }
    ]);

    const expenseByCategory = await BatchExpense.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    const totalBatchExpenses = await BatchExpense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const income = await Finance.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const expenses = await Finance.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Active batches with day count and phase
    const batchSummaries = activeBatches.map(b => ({
      _id: b._id,
      batchNumber: b.batchNumber,
      chicksArrived: b.chicksArrived,
      currentCount: b.currentCount,
      arrivalDate: b.arrivalDate,
      dayCount: b.dayCount,
      phase: b.phase,
      mortalityPercent: b.mortalityPercent,
      breed: b.breed,
      shedType: b.shedType,
      houseNumber: b.houseNumber,
      status: b.status
    }));

    // Today's logs summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await DailyLog.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('batch', 'batchNumber');

    // Recent logs (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeedTotal = await DailyLog.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, totalFeed: { $sum: '$feedGivenKg' }, totalWater: { $sum: '$waterGivenLiters' } } }
    ]);

    res.json({
      activeBatchCount: activeBatches.length,
      totalBirdsAlive,
      totalChicksArrived,
      totalMortality: (totalMortality[0]?.total || 0) + (dailyLogMortality[0]?.total || 0),
      expenseByCategory,
      totalBatchExpenses: totalBatchExpenses[0]?.total || 0,
      financials: {
        totalIncome: income[0]?.total || 0,
        totalExpenses: expenses[0]?.total || 0,
        profit: (income[0]?.total || 0) - (expenses[0]?.total || 0)
      },
      batchSummaries,
      todayLogs,
      recentFeed: {
        totalFeedKg: recentFeedTotal[0]?.totalFeed || 0,
        totalWaterLiters: recentFeedTotal[0]?.totalWater || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
