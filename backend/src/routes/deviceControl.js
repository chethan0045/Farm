const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authenticateDevice } = require('../middleware/deviceAuth');
const { controlRateLimit } = require('../middleware/rateLimit');
const DeviceControl = require('../models/DeviceControl');
const Device = require('../models/Device');

// POST /api/device-control/command - Send command to device (JWT auth)
router.post('/command', authenticate, async (req, res) => {
  try {
    const { deviceId, relay, action, value } = req.body;

    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const validRelays = ['fan', 'light', 'heater', 'feeder', 'waterPump'];
    if (!validRelays.includes(relay)) {
      return res.status(400).json({ error: `Invalid relay. Must be one of: ${validRelays.join(', ')}` });
    }

    const update = {
      device: device._id,
      houseNumber: device.houseNumber,
      [`relays.${relay}.state`]: action,
      lastChangedBy: 'manual',
      lastChangedByUser: req.user._id,
      pendingCommand: {
        relay,
        action,
        value: value || null,
        issuedAt: new Date(),
        acknowledged: false
      }
    };

    // Set speed/brightness if applicable
    if (relay === 'fan' && value != null) update['relays.fan.speed'] = value;
    if (relay === 'light' && value != null) update['relays.light.brightness'] = value;

    const control = await DeviceControl.findOneAndUpdate(
      { device: device._id },
      update,
      { upsert: true, new: true }
    );

    res.json({ message: 'Command sent', control });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/device-control/status/:houseNumber - Current relay states (JWT auth)
router.get('/status/:houseNumber', authenticate, async (req, res) => {
  try {
    const controls = await DeviceControl.find({ houseNumber: req.params.houseNumber })
      .populate('device', 'deviceId name status deviceType')
      .populate('lastChangedByUser', 'username')
      .populate('lastChangedByRule', 'name');

    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/device-control/poll - ESP32 polls for pending commands (Device API key)
router.get('/poll', authenticateDevice, controlRateLimit, async (req, res) => {
  try {
    const control = await DeviceControl.findOne({ device: req.device._id });

    if (control && control.pendingCommand && control.pendingCommand.relay && !control.pendingCommand.acknowledged) {
      res.json({
        hasPendingCommand: true,
        command: {
          relay: control.pendingCommand.relay,
          action: control.pendingCommand.action,
          value: control.pendingCommand.value
        }
      });
    } else {
      res.json({ hasPendingCommand: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/device-control/ack - ESP32 confirms command execution (Device API key)
router.post('/ack', authenticateDevice, controlRateLimit, async (req, res) => {
  try {
    const { success, errorMessage } = req.body;

    const control = await DeviceControl.findOne({ device: req.device._id });
    if (!control || !control.pendingCommand || !control.pendingCommand.relay) {
      return res.status(404).json({ error: 'No pending command' });
    }

    control.pendingCommand.acknowledged = true;
    control.pendingCommand.acknowledgedAt = new Date();
    await control.save();

    res.json({ status: 'ok', acknowledged: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
