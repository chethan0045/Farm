const rateLimit = require('express-rate-limit');

const sensorRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.DEVICE_RATE_LIMIT_PER_MIN) || 120,
  keyGenerator: (req) => req.device ? req.device._id.toString() : 'unknown',
  message: { error: 'Too many requests, slow down sensor reporting interval' },
  validate: { xForwardedForHeader: false }
});

const controlRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.device ? req.device._id.toString() : 'unknown',
  message: { error: 'Too many control requests' },
  validate: { xForwardedForHeader: false }
});

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests, please wait' }
});

module.exports = { sensorRateLimit, controlRateLimit, aiRateLimit };
