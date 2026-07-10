// Express app assembly — everything except DB connection, listening and
// schedulers, so tests can mount the full app against an in-memory MongoDB.
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const mortalityRoutes = require('./routes/mortality');
const batchExpenseRoutes = require('./routes/batchExpenses');
const financeRoutes = require('./routes/finance');
const dashboardRoutes = require('./routes/dashboard');
const dailyLogRoutes = require('./routes/dailyLogs');
const vaccinationRoutes = require('./routes/vaccinations');
const healthLogRoutes = require('./routes/healthLogs');
const alertRoutes = require('./routes/alerts');
const inventoryRoutes = require('./routes/inventory');
const customerRoutes = require('./routes/customers');
const saleRoutes = require('./routes/sales');
const sensorDataRoutes = require('./routes/sensorData');
const deviceRoutes = require('./routes/devices');
const deviceControlRoutes = require('./routes/deviceControl');
const automationRuleRoutes = require('./routes/automationRules');
const aiRoutes = require('./routes/ai');
const sensorAlertRoutes = require('./routes/sensorAlerts');
const escalationPolicyRoutes = require('./routes/escalationPolicies');
const cameraRoutes = require('./routes/cameras');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind Render's proxy: trust the first hop so req.ip (used by rate
// limiters) is the real client IP, not the proxy's.
app.set('trust proxy', 1);

// Middleware
// CSP is off: index.html registers the service worker via an inline script
// and Angular emits inline styles; the other helmet headers still apply.
app.use(helmet({ contentSecurityPolicy: false }));
// The SPA is served same-origin by this server, so CORS is only needed for
// separate frontends (e.g. ng serve in dev). Never reflect '*' with credentials.
const corsOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.push('http://localhost:4200');
}
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : false,
  credentials: true
}));
app.use(express.json({ limit: '200kb' }));
// Strip $-operators and dotted keys from query/body/params so user input
// can never smuggle MongoDB operators into find/update filters.
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/mortality', mortalityRoutes);
app.use('/api/batch-expenses', batchExpenseRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/daily-logs', dailyLogRoutes);
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/health-logs', healthLogRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/sensor-data', sensorDataRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/device-control', deviceControlRoutes);
app.use('/api/automation-rules', automationRuleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sensor-alerts', sensorAlertRoutes);
app.use('/api/escalation-policies', escalationPolicyRoutes);
app.use('/api/cameras', cameraRoutes);

// Serve Angular frontend in production.
// Hashed bundles (main-*.js, chunk-*.js, styles-*.css) are content-addressed,
// so cache them forever; index.html must NEVER be cached, otherwise a browser
// can hold a stale index that references deleted bundles -> blank screen.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    // index.html and PWA control files must never be cached, otherwise phones
    // keep a stale app shell / never pick up a new service worker.
    if (/(index\.html|service-worker\.js|manifest\.webmanifest)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback for client-side routes. Only serve index.html for navigation
// requests (no file extension). A request for a missing asset (e.g. an old
// hashed bundle) must 404 instead of silently returning index.html as HTML —
// returning HTML where JS is expected white-screens the app with no error.
app.get(/^\/(?!api).*/, (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Health check — reports degraded (503) if MongoDB is not connected
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'OK' : 'DEGRADED',
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Terminal error handler — must be registered after all routes
app.use(errorHandler);

module.exports = app;
