const Device = require('../models/Device');

const authenticateDevice = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    const device = await Device.findOne({ apiKey, isActive: true }).lean();
    if (!device) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Targeted $set instead of a full document save — this runs on every
    // sensor POST (up to 120/min/device). Fire-and-forget: liveness metadata
    // isn't worth adding latency to the reading. A device in maintenance
    // stays in maintenance; posting data doesn't flip it back online.
    const liveness = { lastSeen: new Date() };
    if (req.ip) liveness.ipAddress = req.ip;
    if (device.status !== 'maintenance') liveness.status = 'online';
    Device.updateOne({ _id: device._id }, { $set: liveness })
      .catch(err => console.error('[Device Auth] lastSeen update failed:', err.message));

    req.device = device;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Device authentication failed' });
  }
};

module.exports = { authenticateDevice };
