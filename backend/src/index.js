require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server + schedulers
const { startAlertScheduler } = require('./services/alertGenerator');
const { startDeviceHealthChecker } = require('./services/deviceManager');
const { startAIScheduler } = require('./services/aiEngine');
const { startEscalationChecker } = require('./services/alertEscalation');
const { startAutomationScheduler } = require('./services/automationEngine');
const { startDtuListener } = require('./services/dtuListener');
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startAlertScheduler();
    startDeviceHealthChecker();
    startAIScheduler();
    startEscalationChecker();
    startAutomationScheduler();
    startDtuListener(); // only runs if DTU_LISTENER_PORT is set
  });
});

// A rejection that escaped every route/scheduler try/catch is a bug, but it
// shouldn't kill a server controlling live farm equipment — log and continue.
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
});
// After an uncaught exception the process state is unknown — exit and let
// the platform (Render) restart us.
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received: draining connections`);
  if (!server) process.exit(0);
  server.close(() => {
    mongoose.connection.close().finally(() => process.exit(0));
  });
  // Schedulers keep their intervals until exit; force out if drain stalls.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
