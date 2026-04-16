const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authenticateDevice } = require('../middleware/deviceAuth');
const { sensorRateLimit } = require('../middleware/rateLimit');
const SensorData = require('../models/SensorData');
const DeviceControl = require('../models/DeviceControl');
const { processSensorData } = require('../services/sensorProcessor');

// POST /api/sensor-data - ESP32 pushes sensor readings
router.post('/', authenticateDevice, sensorRateLimit, async (req, res) => {
  try {
    const device = req.device;
    const reading = req.body;

    await processSensorData(device, reading);

    // Check for pending command to piggyback in response
    let pendingCommand = null;
    const control = await DeviceControl.findOne({ device: device._id });
    if (control && control.pendingCommand && control.pendingCommand.relay && !control.pendingCommand.acknowledged) {
      pendingCommand = {
        relay: control.pendingCommand.relay,
        action: control.pendingCommand.action,
        value: control.pendingCommand.value
      };
    }

    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      pendingCommand
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensor-data/bulk - ESP32 sends buffered readings
router.post('/bulk', authenticateDevice, sensorRateLimit, async (req, res) => {
  try {
    const device = req.device;
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'readings array is required' });
    }

    let processed = 0;
    for (const reading of readings.slice(0, 100)) { // cap at 100
      await processSensorData(device, reading);
      processed++;
    }

    res.json({ status: 'ok', processed, serverTime: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/latest/:houseNumber - Latest reading per house
router.get('/latest/:houseNumber', authenticate, async (req, res) => {
  try {
    const latest = await SensorData.findOne({ houseNumber: req.params.houseNumber })
      .sort({ timestamp: -1 })
      .populate('device', 'deviceId name status');

    if (!latest) {
      return res.json({ message: 'No sensor data found for this house' });
    }

    // Map ammoniaPPM to legacy enum for backward compatibility
    let ammoniaLevel = 'low';
    if (latest.ammoniaPPM > 50) ammoniaLevel = 'high';
    else if (latest.ammoniaPPM > 20) ammoniaLevel = 'medium';

    res.json({ ...latest.toObject(), ammoniaLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/history/:houseNumber - Historical data with resolution
router.get('/history/:houseNumber', authenticate, async (req, res) => {
  try {
    const { houseNumber } = req.params;
    const { from, to, resolution = 'raw' } = req.query;

    const match = { houseNumber };
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    } else {
      // Default: last 24 hours
      match.timestamp = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    if (resolution === 'raw') {
      const data = await SensorData.find(match)
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();
      return res.json(data);
    }

    // Aggregated resolutions
    const truncUnit = { '5min': 'minute', 'hourly': 'hour', 'daily': 'day' }[resolution];
    if (!truncUnit) {
      return res.status(400).json({ error: 'Invalid resolution. Use: raw, 5min, hourly, daily' });
    }

    const binSize = resolution === '5min' ? 5 : 1;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$timestamp',
              unit: truncUnit,
              ...(resolution === '5min' ? { binSize: 5 } : {})
            }
          },
          temperature: { $avg: '$temperature' },
          humidity: { $avg: '$humidity' },
          ammoniaPPM: { $avg: '$ammoniaPPM' },
          co2PPM: { $avg: '$co2PPM' },
          lightIntensity: { $avg: '$lightIntensity' },
          feedLevelPercent: { $avg: '$feedLevelPercent' },
          waterLevelPercent: { $avg: '$waterLevelPercent' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 500 },
      {
        $project: {
          _id: 0,
          timestamp: '$_id',
          temperature: { $round: ['$temperature', 1] },
          humidity: { $round: ['$humidity', 1] },
          ammoniaPPM: { $round: ['$ammoniaPPM', 1] },
          co2PPM: { $round: ['$co2PPM', 0] },
          lightIntensity: { $round: ['$lightIntensity', 0] },
          feedLevelPercent: { $round: ['$feedLevelPercent', 1] },
          waterLevelPercent: { $round: ['$waterLevelPercent', 1] },
          readingCount: '$count'
        }
      }
    ];

    const data = await SensorData.aggregate(pipeline);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/summary - All houses latest readings
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Get distinct house numbers from recent data
    const houses = await SensorData.distinct('houseNumber', {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const summary = [];
    for (const houseNumber of houses) {
      const latest = await SensorData.findOne({ houseNumber })
        .sort({ timestamp: -1 })
        .lean();
      if (latest) {
        summary.push({ houseNumber, ...latest });
      }
    }

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
