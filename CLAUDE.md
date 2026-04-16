# Smart Poultry Farm Management System

## Overview
A full-stack smart poultry farm management system with IoT sensor integration, AI-powered predictions, automated device control, and real-time monitoring. Combines manual farm management (batches, mortality, finances) with IoT sensors (ESP32), automation rules, and AI analytics.

## Tech Stack
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT Authentication
- **Frontend**: Angular 21 (standalone components), Tailwind CSS 4
- **Database**: MongoDB Atlas (cluster0)
- **IoT**: ESP32 devices communicating via HTTP REST API with API key authentication
- **AI**: Rule-based prediction engine in pure Node.js (disease risk, mortality prediction, FCR optimization)
- **Deployment**: Render.com

## Architecture
```
ESP32 Sensors --> POST /api/sensor-data (X-API-Key auth)
                      |
               sensorProcessor.js (threshold checks)
                      |
          +-----------+--------------+
          |           |              |
    SensorAlert  automationEngine  aiEngine (scheduled)
                      |              |
                DeviceControl    AIInsight
                (pendingCommand)  (recommendations)
                      |
                ESP32 reads command from POST response
```

## Project Structure
```
farm_manager/
├── backend/
│   ├── src/
│   │   ├── config/db.js                # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT authentication
│   │   │   ├── deviceAuth.js           # ESP32 API key authentication
│   │   │   └── rateLimit.js            # Rate limiting for sensor/control/AI endpoints
│   │   ├── models/
│   │   │   ├── User.js                 # User accounts
│   │   │   ├── Batch.js                # Poultry batches
│   │   │   ├── DailyLog.js             # Daily monitoring (feed, water, weight, environment)
│   │   │   ├── Mortality.js            # Mortality records
│   │   │   ├── HealthLog.js            # Disease/treatment tracking
│   │   │   ├── Vaccination.js          # Vaccination schedules
│   │   │   ├── BatchExpense.js         # Per-batch expenses
│   │   │   ├── Finance.js              # Income/expense tracking
│   │   │   ├── Inventory.js            # Stock management
│   │   │   ├── InventoryTransaction.js # Stock transactions
│   │   │   ├── Customer.js             # Customer records
│   │   │   ├── Sale.js                 # Sales records
│   │   │   ├── Alert.js                # Batch-level alerts
│   │   │   ├── Device.js               # Registered ESP32 devices (API key, capabilities)
│   │   │   ├── SensorData.js           # Real-time sensor readings (90-day TTL)
│   │   │   ├── SensorAlert.js          # Sensor-triggered alerts
│   │   │   ├── DeviceControl.js        # Relay states and pending commands
│   │   │   ├── AutomationRule.js       # If-then automation rules
│   │   │   ├── AIInsight.js            # AI-generated predictions/recommendations
│   │   │   ├── PredictionLog.js        # Prediction accuracy tracking
│   │   │   └── EscalationPolicy.js     # Alert escalation configuration
│   │   ├── routes/
│   │   │   ├── auth.js                 # POST /api/auth/login, /register, GET /me
│   │   │   ├── batches.js              # CRUD /api/batches
│   │   │   ├── dailyLogs.js            # CRUD /api/daily-logs + analytics
│   │   │   ├── mortality.js            # GET|POST|DELETE /api/mortality
│   │   │   ├── healthLogs.js           # CRUD /api/health-logs
│   │   │   ├── vaccinations.js         # CRUD /api/vaccinations
│   │   │   ├── batchExpenses.js        # CRUD /api/batch-expenses
│   │   │   ├── finance.js              # CRUD /api/finance
│   │   │   ├── dashboard.js            # GET /api/dashboard
│   │   │   ├── alerts.js               # CRUD /api/alerts
│   │   │   ├── inventory.js            # CRUD /api/inventory + transactions
│   │   │   ├── customers.js            # CRUD /api/customers
│   │   │   ├── sales.js                # CRUD /api/sales
│   │   │   ├── sensorData.js           # POST /api/sensor-data (ESP32), GET latest/history/summary
│   │   │   ├── devices.js              # CRUD /api/devices (register, manage ESP32)
│   │   │   ├── deviceControl.js        # POST command, GET status, poll, ack
│   │   │   ├── automationRules.js      # CRUD /api/automation-rules + presets
│   │   │   ├── ai.js                   # GET insights, POST analyze, GET recommendations
│   │   │   ├── sensorAlerts.js         # GET/PUT /api/sensor-alerts
│   │   │   └── escalationPolicies.js   # CRUD /api/escalation-policies
│   │   ├── services/
│   │   │   ├── alertGenerator.js       # Hourly batch alert scanner
│   │   │   ├── sensorProcessor.js      # Process sensor data, check thresholds, create alerts
│   │   │   ├── deviceManager.js        # Device health monitoring, API key generation
│   │   │   ├── automationEngine.js     # Rule evaluation engine with cooldowns/overrides
│   │   │   ├── breedStandards.js       # Optimal ranges, weight/feed/FCR standards (Cobb 500)
│   │   │   ├── aiEngine.js             # Disease risk, mortality prediction, FCR, env score
│   │   │   ├── recommendationEngine.js # Natural-language actionable recommendations
│   │   │   ├── alertEscalation.js      # Multi-channel alert escalation
│   │   │   └── notificationChannels.js # Push/SMS/WhatsApp notification abstraction
│   │   └── index.js                    # Entry point, route registration, scheduler startup
│   ├── public/                         # Angular production build
│   └── package.json
├── frontend/
│   └── src/app/
│       ├── components/
│       │   ├── dashboard/              # Main dashboard
│       │   ├── batches/                # Batch management
│       │   ├── daily-logs/             # Daily monitoring
│       │   ├── mortality/              # Mortality records
│       │   ├── health/                 # Health & vaccination
│       │   ├── batch-expenses/         # Batch expenses
│       │   ├── inventory/              # Stock management
│       │   ├── sales/                  # Sales & customers
│       │   ├── finance/                # Finance tracking
│       │   ├── alerts/                 # Alert management
│       │   ├── iot-dashboard/          # Live sensor monitoring per house
│       │   ├── devices/                # ESP32 device registration & management
│       │   ├── device-control/         # Manual relay control panel
│       │   ├── automation-rules/       # Automation rule builder
│       │   ├── ai-insights/            # AI predictions & recommendations
│       │   ├── login/                  # Login page
│       │   ├── register/               # Registration page
│       │   └── layout/                 # Main layout with sidebar
│       ├── services/
│       │   ├── api.service.ts          # All HTTP API methods
│       │   └── auth.service.ts         # JWT auth management
│       ├── guards/auth.guard.ts        # Route protection
│       └── interceptors/auth.interceptor.ts  # Auto-attach JWT token
└── CLAUDE.md
```

## Features

### Farm Management
- **Batch Management**: Track batches with batch number, chicks arrived, breed, supplier, cost
- **Daily Monitoring**: Feed, water, weight, temperature, humidity, ammonia, ventilation, mortality
- **Mortality Tracking**: Record deaths per batch with cause, auto-updates bird count
- **Health & Vaccination**: Disease tracking, treatments, vaccination schedules
- **Batch Expenses**: Track per-batch costs by category
- **Finance Management**: Income/expense tracking with profit calculation
- **Inventory**: Stock tracking with low-stock alerts and transactions
- **Sales**: Customer management and sales records
- **Dashboard**: Overview with stats, expense breakdown, mortality charts

### IoT Integration
- **Device Registration**: Register ESP32 devices with API keys, assign to houses
- **Real-time Sensor Data**: Temperature, humidity, ammonia (ppm), CO2, light, feed/water levels
- **Device Control**: Fan (with speed), light (with brightness), heater, feeder, water pump relays
- **Command Piggyback**: ESP32 receives pending commands in sensor POST response
- **Device Health**: Auto-detect offline devices, status monitoring

### Automation
- **Rule Engine**: If-then rules with compound conditions (AND/OR logic)
- **Supported Sensors**: temperature, humidity, ammoniaPPM, co2PPM, lightIntensity, feedLevelPercent, waterLevelPercent
- **Actions**: controlRelay, sendAlert, or both
- **Cooldowns**: Prevent rapid toggling (configurable per rule)
- **Manual Override**: Temporarily disable rules with expiration
- **Preset Templates**: Common rules (high temp, ammonia, humidity, feed/water levels)

### AI Engine
- **Disease Risk Score (0-100)**: Weighted multi-factor (temp 20%, ammonia 20%, mortality 20%, age 10%, season 10%, humidity 10%, health history 10%)
- **Mortality Prediction**: 7-day forecast using EMA blended with age-based baseline
- **FCR Optimization**: Compare actual vs Cobb 500 breed standards, suggest feed adjustments
- **Environment Score (0-100)**: Penalty-based scoring against optimal ranges for bird age
- **Recommendations**: Natural-language actionable suggestions with priority ranking
- **Breed Standards**: Cobb 500 reference data (weight, feed, FCR by day 1-42)

### Alert System
- **Batch Alerts**: Mortality, temperature, ammonia, water ratio, inventory, vaccination
- **Sensor Alerts**: Real-time threshold-based with age-adjusted ranges
- **Escalation Policies**: Multi-level (in_app -> push -> SMS/WhatsApp) with configurable delays
- **Notification Channels**: In-app, push (web-push), SMS (Twilio), WhatsApp (Twilio)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Farm Management
- `GET /api/dashboard` - Dashboard stats
- `CRUD /api/batches` - Batch management
- `CRUD /api/daily-logs` - Daily monitoring + `GET analytics/:batchId`
- `GET|POST|DELETE /api/mortality` - Mortality records
- `CRUD /api/health-logs` - Health tracking
- `CRUD /api/vaccinations` - Vaccination schedules + `GET upcoming`
- `CRUD /api/batch-expenses` - Batch expenses + `GET summary/:batchId`
- `CRUD /api/finance` - Finance + `GET summary`
- `CRUD /api/inventory` - Inventory + transactions + `GET low-stock`
- `CRUD /api/customers` - Customer management
- `CRUD /api/sales` - Sales + `GET summary`
- `CRUD /api/alerts` - Alert management

### IoT (Device API key auth via X-API-Key header)
- `POST /api/sensor-data` - ESP32 pushes readings, returns pendingCommand
- `POST /api/sensor-data/bulk` - Buffered offline readings
- `GET /api/sensor-data/latest/:houseNumber` - Latest reading per house
- `GET /api/sensor-data/history/:houseNumber` - Historical data (?from, to, resolution)
- `GET /api/sensor-data/summary` - All houses' latest readings

### Devices (JWT auth)
- `CRUD /api/devices` - Device registration and management
- `GET /api/devices/overview` - House overview with sensor summary
- `POST /api/devices/:id/regenerate-key` - Regenerate API key

### Device Control
- `POST /api/device-control/command` - Send relay command (JWT)
- `GET /api/device-control/status/:houseNumber` - Current relay states (JWT)
- `GET /api/device-control/poll` - ESP32 polls for commands (API key)
- `POST /api/device-control/ack` - ESP32 confirms execution (API key)

### Automation Rules (JWT auth)
- `CRUD /api/automation-rules` - Rule management
- `GET /api/automation-rules/presets` - Built-in templates
- `PUT /api/automation-rules/:id/toggle` - Enable/disable
- `PUT /api/automation-rules/:id/override` - Manual override
- `POST /api/automation-rules/evaluate` - Force evaluate all

### AI (JWT auth)
- `GET /api/ai/insights` - List insights (?batchId, category, severity)
- `GET /api/ai/insights/:batchId` - Batch insights
- `POST /api/ai/analyze` - Trigger analysis
- `GET /api/ai/recommendations/:batchId` - Actionable recommendations
- `GET /api/ai/dashboard` - AI summary (metrics, recommendations, insights)
- `PUT /api/ai/insights/:id/dismiss` - Dismiss insight

### Sensor Alerts & Escalation (JWT auth)
- `GET /api/sensor-alerts` - List sensor alerts
- `GET /api/sensor-alerts/unread-count` - Unread count
- `PUT /api/sensor-alerts/:id/read|resolve` - Mark read/resolved
- `CRUD /api/escalation-policies` - Escalation policy management

## Scheduled Services
- **Alert Generator**: Every 1 hour (batch-level alerts)
- **Device Health Checker**: Every 2 minutes (offline detection)
- **AI Engine**: Every 6 hours (analysis of all active batches)
- **Alert Escalation**: Every 2 minutes (escalate unresolved alerts)
- **Automation Engine**: Event-driven on sensor POST + supplement every 5 min via evaluateAll

## Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && ng serve
```

## Environment Variables (Backend)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - Frontend URL for CORS
- `DEVICE_RATE_LIMIT_PER_MIN` - Sensor endpoint rate limit (default: 120)
- `AI_ANALYSIS_INTERVAL_HOURS` - AI analysis frequency (default: 6)
- `SMS_PROVIDER` - SMS provider name (e.g., 'twilio')
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio sender phone
- `WHATSAPP_PHONE_NUMBER` - WhatsApp sender phone
- `VAPID_PUBLIC_KEY` - Web push VAPID public key
- `VAPID_PRIVATE_KEY` - Web push VAPID private key

## Build & Deploy
```bash
# Build frontend and copy to backend
cd frontend && ng build
cp -r dist/frontend/browser/* ../backend/public/

# Start production server
cd backend && npm start
```

## ESP32 Integration
```
POST /api/sensor-data
Headers: X-API-Key: <64-char-hex>
Body: { temperature, humidity, ammoniaPPM, co2PPM, feedLevelPercent, waterLevelPercent }
Response: { status: "ok", serverTime: "...", pendingCommand: { relay, action, value } | null }
```
