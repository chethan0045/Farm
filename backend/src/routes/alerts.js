const express = require('express');
const Alert = require('../models/Alert');
const DailyLog = require('../models/DailyLog');
const Batch = require('../models/Batch');
const Inventory = require('../models/Inventory');
const Vaccination = require('../models/Vaccination');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { isRead } = req.query;
    const filter = {};
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    const alerts = await Alert.find(filter).populate('batch', 'batchNumber').sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate alerts based on current data
router.post('/generate', async (req, res) => {
  try {
    const newAlerts = [];
    const batches = await Batch.find({ status: 'active' });

    for (const batch of batches) {
      // Check mortality rate
      const mortalityPct = parseFloat(batch.mortalityPercent);
      if (mortalityPct > 5) {
        const exists = await Alert.findOne({ batch: batch._id, type: 'mortality', isResolved: false });
        if (!exists) {
          newAlerts.push(await Alert.create({
            batch: batch._id, type: 'mortality', severity: mortalityPct > 10 ? 'critical' : 'danger',
            title: `High Mortality - ${batch.batchNumber}`,
            message: `Mortality rate is ${mortalityPct}% (${batch.chicksArrived - batch.currentCount} dead out of ${batch.chicksArrived}). Should be < 5%.`
          }));
        }
      }

      // Check latest daily log for environment issues
      const latestLog = await DailyLog.findOne({ batch: batch._id }).sort({ date: -1 });
      if (latestLog) {
        if (latestLog.temperature && latestLog.temperature > 35) {
          const exists = await Alert.findOne({ batch: batch._id, type: 'temperature', isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
          if (!exists) {
            newAlerts.push(await Alert.create({
              batch: batch._id, type: 'temperature', severity: latestLog.temperature > 38 ? 'critical' : 'warning',
              title: `High Temperature - ${batch.batchNumber}`,
              message: `Temperature is ${latestLog.temperature}°C. Max recommended: 34°C for Day ${batch.dayCount}.`
            }));
          }
        }
        if (latestLog.ammonia === 'high') {
          const exists = await Alert.findOne({ batch: batch._id, type: 'general', title: { $regex: /Ammonia/ }, isResolved: false });
          if (!exists) {
            newAlerts.push(await Alert.create({
              batch: batch._id, type: 'general', severity: 'danger',
              title: `High Ammonia - ${batch.batchNumber}`,
              message: `Ammonia level is HIGH. Increase ventilation immediately.`
            }));
          }
        }
        // Low water alert
        if (latestLog.waterGivenLiters > 0 && latestLog.feedGivenKg > 0) {
          const ratio = latestLog.waterGivenLiters / latestLog.feedGivenKg;
          if (ratio < 1.5) {
            const exists = await Alert.findOne({ batch: batch._id, type: 'water', isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
            if (!exists) {
              newAlerts.push(await Alert.create({
                batch: batch._id, type: 'water', severity: 'warning',
                title: `Low Water Intake - ${batch.batchNumber}`,
                message: `Water:Feed ratio is ${ratio.toFixed(1)}. Should be ~2.0. Check for health issues.`
              }));
            }
          }
        }
      }
    }

    // Inventory low stock alerts
    const lowStock = await Inventory.find({ $expr: { $lte: ['$currentStock', '$minStockLevel'] } });
    for (const item of lowStock) {
      const exists = await Alert.findOne({ type: 'inventory', title: { $regex: item.name }, isResolved: false });
      if (!exists) {
        newAlerts.push(await Alert.create({
          type: 'inventory', severity: item.currentStock === 0 ? 'critical' : 'warning',
          title: `Low Stock - ${item.name}`,
          message: `${item.name} stock is ${item.currentStock} ${item.unit}. Min level: ${item.minStockLevel} ${item.unit}.`
        }));
      }
    }

    // Upcoming vaccinations
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dueVaccines = await Vaccination.find({ status: 'scheduled', scheduledDate: { $lte: tomorrow } }).populate('batch', 'batchNumber');
    for (const vac of dueVaccines) {
      const exists = await Alert.findOne({ type: 'vaccination', title: { $regex: vac.vaccineName }, isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (!exists) {
        newAlerts.push(await Alert.create({
          batch: vac.batch?._id, type: 'vaccination', severity: 'warning',
          title: `Vaccination Due - ${vac.vaccineName}`,
          message: `${vac.vaccineName} is due for ${vac.batch?.batchNumber || 'batch'}. Scheduled: ${vac.scheduledDate.toDateString()}.`
        }));
      }
    }

    res.json({ generated: newAlerts.length, alerts: newAlerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isResolved: true, isRead: true }, { new: true });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
