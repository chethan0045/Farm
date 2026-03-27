const express = require('express');
const Batch = require('../models/Batch');
const Mortality = require('../models/Mortality');
const BatchExpense = require('../models/BatchExpense');
const Finance = require('../models/Finance');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const activeBatches = await Batch.countDocuments({ status: 'active' });
    const totalBirds = await Batch.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$currentCount' }, arrived: { $sum: '$chicksArrived' } } }
    ]);

    const totalMortality = await Mortality.aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
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

    const recentBatches = await Batch.find().sort({ createdAt: -1 }).limit(5);

    const mortalityByBatch = await Mortality.aggregate([
      { $group: { _id: '$batch', total: { $sum: '$count' } } },
      { $lookup: { from: 'batches', localField: '_id', foreignField: '_id', as: 'batchInfo' } },
      { $unwind: '$batchInfo' },
      { $project: { batchNumber: '$batchInfo.batchNumber', total: 1 } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      activeBatches,
      totalBirdsAlive: totalBirds[0]?.total || 0,
      totalChicksArrived: totalBirds[0]?.arrived || 0,
      totalMortality: totalMortality[0]?.total || 0,
      expenseByCategory,
      totalBatchExpenses: totalBatchExpenses[0]?.total || 0,
      financials: {
        totalIncome: income[0]?.total || 0,
        totalExpenses: expenses[0]?.total || 0,
        profit: (income[0]?.total || 0) - (expenses[0]?.total || 0)
      },
      recentBatches,
      mortalityByBatch
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
