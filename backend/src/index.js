require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

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

// Serve Angular frontend in production
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
