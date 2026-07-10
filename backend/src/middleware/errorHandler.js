// Terminal error middleware. Known client errors map to 4xx with a safe
// message; everything else is logged in full and returned as a generic 500
// so internal details (driver errors, stack info) never reach clients.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'A record with this unique value already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
