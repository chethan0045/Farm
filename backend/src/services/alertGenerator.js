const Batch = require('../models/Batch');
const DailyLog = require('../models/DailyLog');
const Inventory = require('../models/Inventory');
const Vaccination = require('../models/Vaccination');
const Alert = require('../models/Alert');

async function generateAlerts() {
  try {
    const batches = await Batch.find({ status: 'active' });

    for (const batch of batches) {
      // High mortality
      const mortalityPct = parseFloat(batch.mortalityPercent);
      if (mortalityPct > 5) {
        const exists = await Alert.findOne({ batch: batch._id, type: 'mortality', isResolved: false });
        if (!exists) {
          await Alert.create({
            batch: batch._id, type: 'mortality', severity: mortalityPct > 10 ? 'critical' : 'danger',
            title: `High Mortality - ${batch.batchNumber}`,
            message: `Mortality rate is ${mortalityPct}% (${batch.chicksArrived - batch.currentCount} dead out of ${batch.chicksArrived}). Should be < 5%.`
          });
        }
      }

      // Check latest daily log
      const latestLog = await DailyLog.findOne({ batch: batch._id }).sort({ date: -1 });
      if (latestLog) {
        // High temperature
        if (latestLog.temperature && latestLog.temperature > 35) {
          const exists = await Alert.findOne({ batch: batch._id, type: 'temperature', isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
          if (!exists) {
            await Alert.create({
              batch: batch._id, type: 'temperature', severity: latestLog.temperature > 38 ? 'critical' : 'warning',
              title: `High Temperature - ${batch.batchNumber}`,
              message: `Temperature is ${latestLog.temperature}°C. Max recommended: 34°C for Day ${batch.dayCount}.`
            });
          }
        }

        // High ammonia
        if (latestLog.ammonia === 'high') {
          const exists = await Alert.findOne({ batch: batch._id, type: 'general', title: { $regex: /Ammonia/ }, isResolved: false });
          if (!exists) {
            await Alert.create({
              batch: batch._id, type: 'general', severity: 'danger',
              title: `High Ammonia - ${batch.batchNumber}`,
              message: `Ammonia level is HIGH. Increase ventilation immediately.`
            });
          }
        }

        // Low water
        if (latestLog.waterGivenLiters > 0 && latestLog.feedGivenKg > 0) {
          const ratio = latestLog.waterGivenLiters / latestLog.feedGivenKg;
          if (ratio < 1.5) {
            const exists = await Alert.findOne({ batch: batch._id, type: 'water', isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
            if (!exists) {
              await Alert.create({
                batch: batch._id, type: 'water', severity: 'warning',
                title: `Low Water Intake - ${batch.batchNumber}`,
                message: `Water:Feed ratio is ${ratio.toFixed(1)}. Should be ~2.0. Check for health issues.`
              });
            }
          }
        }
      }
    }

    // Low stock
    const lowStock = await Inventory.find({ $expr: { $lte: ['$currentStock', '$minStockLevel'] } });
    for (const item of lowStock) {
      const exists = await Alert.findOne({ type: 'inventory', title: { $regex: item.name }, isResolved: false });
      if (!exists) {
        await Alert.create({
          type: 'inventory', severity: item.currentStock === 0 ? 'critical' : 'warning',
          title: `Low Stock - ${item.name}`,
          message: `${item.name} stock is ${item.currentStock} ${item.unit}. Min level: ${item.minStockLevel} ${item.unit}.`
        });
      }
    }

    // Vaccination due
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dueVaccines = await Vaccination.find({ status: 'scheduled', scheduledDate: { $lte: tomorrow } }).populate('batch', 'batchNumber');
    for (const vac of dueVaccines) {
      const exists = await Alert.findOne({ type: 'vaccination', title: { $regex: vac.vaccineName }, isResolved: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (!exists) {
        await Alert.create({
          batch: vac.batch?._id, type: 'vaccination', severity: 'warning',
          title: `Vaccination Due - ${vac.vaccineName}`,
          message: `${vac.vaccineName} is due for ${vac.batch?.batchNumber || 'batch'}. Scheduled: ${vac.scheduledDate.toDateString()}.`
        });
      }
    }

    console.log(`[Alert Generator] Scan complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Alert Generator] Error:', err.message);
  }
}

function startAlertScheduler() {
  // Run on startup after 30 seconds
  setTimeout(() => generateAlerts(), 30000);
  // Then every 1 hour
  setInterval(() => generateAlerts(), 60 * 60 * 1000);
  console.log('[Alert Generator] Scheduler started - runs every 1 hour');
}

module.exports = { generateAlerts, startAlertScheduler };
