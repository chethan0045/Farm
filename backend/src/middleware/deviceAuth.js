const Device = require('../models/Device');

const authenticateDevice = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    const device = await Device.findOne({ apiKey, isActive: true });
    if (!device) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    device.lastSeen = new Date();
    device.status = 'online';
    if (req.ip) device.ipAddress = req.ip;
    await device.save();

    req.device = device;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Device authentication failed' });
  }
};

module.exports = { authenticateDevice };
