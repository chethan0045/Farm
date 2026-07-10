const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authenticateDevice } = require('../middleware/deviceAuth');
const { controlRateLimit } = require('../middleware/rateLimit');
const DeviceControl = require('../models/DeviceControl');
const Device = require('../models/Device');

// POST /api/device-control/command - Send command to device (JWT auth)
router.post('/command', authenticate, async (req, res, next) => {
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
      lastChangedByUser: req.user.id,
      pendingCommand: {
        commandId: crypto.randomBytes(8).toString('hex'),
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

    // Only overwrite the pending command slot if it's free (acked or expired).
    // With upsert, a doc that exists but fails the slot-free filter triggers a
    // duplicate-key insert on the unique device index — that's our conflict signal.
    let control;
    try {
      control = await DeviceControl.findOneAndUpdate(
        { device: device._id, ...DeviceControl.commandSlotFree() },
        update,
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        const existing = await DeviceControl.findOne({ device: device._id }).lean();
        return res.status(409).json({
          error: 'Device has an unacknowledged pending command. Retry after it is acknowledged or expires.',
          pendingCommand: existing?.pendingCommand
        });
      }
      throw err;
    }

    res.json({ message: 'Command sent', control });
  } catch (err) {
    next(err);
  }
});

// GET /api/device-control/status/:houseNumber - Current relay states (JWT auth)
router.get('/status/:houseNumber', authenticate, async (req, res, next) => {
  try {
    const controls = await DeviceControl.find({ houseNumber: req.params.houseNumber })
      .populate('device', 'deviceId name status deviceType')
      .populate('lastChangedByUser', 'username')
      .populate('lastChangedByRule', 'name');

    res.json(controls);
  } catch (err) {
    next(err);
  }
});

// GET /api/device-control/poll - ESP32 polls for pending commands (Device API key)
router.get('/poll', authenticateDevice, controlRateLimit, async (req, res, next) => {
  try {
    const control = await DeviceControl.findOne({ device: req.device._id });

    if (control && DeviceControl.isCommandActive(control.pendingCommand)) {
      res.json({
        hasPendingCommand: true,
        command: {
          commandId: control.pendingCommand.commandId,
          relay: control.pendingCommand.relay,
          action: control.pendingCommand.action,
          value: control.pendingCommand.value
        }
      });
    } else {
      res.json({ hasPendingCommand: false });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/device-control/ack - ESP32 confirms command execution (Device API key)
router.post('/ack', authenticateDevice, controlRateLimit, async (req, res, next) => {
  try {
    const { commandId, success, errorMessage } = req.body;

    const control = await DeviceControl.findOne({ device: req.device._id });
    if (!control || !control.pendingCommand || !control.pendingCommand.relay) {
      return res.status(404).json({ error: 'No pending command' });
    }

    // If the device echoes a commandId, only ack the matching command — a new
    // command issued between the device's poll and its ack must not be
    // silently marked done without ever executing.
    if (commandId && control.pendingCommand.commandId && commandId !== control.pendingCommand.commandId) {
      return res.status(409).json({ error: 'Command mismatch: a newer command is pending', acknowledged: false });
    }

    control.pendingCommand.acknowledged = true;
    control.pendingCommand.acknowledgedAt = new Date();
    if (success !== undefined) control.pendingCommand.success = !!success;
    if (errorMessage) control.pendingCommand.error = String(errorMessage);
    await control.save();

    res.json({ status: 'ok', acknowledged: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
