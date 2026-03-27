# Poultry Farm Management System

## Overview
A full-stack poultry farm management application for tracking batches, mortality, farm expenses, and finances.

## Tech Stack
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT Authentication
- **Frontend**: Angular 19 (standalone components), Tailwind CSS 4
- **Database**: MongoDB Atlas (cluster0)
- **Deployment**: Render.com

## Project Structure
```
farm_manager/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/auth.js     # JWT authentication
│   │   ├── models/               # Mongoose models
│   │   │   ├── User.js
│   │   │   ├── Batch.js
│   │   │   ├── Mortality.js
│   │   │   ├── BatchExpense.js
│   │   │   └── Finance.js
│   │   ├── routes/               # Express routes
│   │   │   ├── auth.js
│   │   │   ├── batches.js
│   │   │   ├── mortality.js
│   │   │   ├── batchExpenses.js
│   │   │   ├── finance.js
│   │   │   └── dashboard.js
│   │   └── index.js              # Entry point
│   ├── public/                   # Angular production build
│   └── package.json
├── frontend/
│   └── src/app/
│       ├── components/           # Angular standalone components
│       ├── services/             # API & Auth services
│       ├── guards/               # Route guards
│       └── interceptors/         # HTTP interceptors
└── CLAUDE.md
```

## Features
- **Authentication**: JWT-based login/register
- **Batch Management**: Track batches with batch number, chicks arrived, breed, supplier, cost
- **Mortality Tracking**: Record deaths per batch with cause, auto-updates bird count
- **Batch Expenses**: Track per-batch costs (electricity, diesel, medicine, water, feed, labor, etc.)
- **Finance Management**: Income/expense tracking with profit calculation
- **Dashboard**: Overview with stats, expense breakdown by category, mortality chart

## API Endpoints
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/dashboard` - Dashboard stats
- `CRUD /api/batches` - Batch management
- `GET|POST|DELETE /api/mortality` - Mortality records
- `CRUD /api/batch-expenses` - Batch expense tracking
- `GET /api/batch-expenses/summary/:batchId` - Per-batch expense summary
- `CRUD /api/finance` - Finance records
- `GET /api/finance/summary` - Financial summary

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

## Build & Deploy
```bash
# Build frontend and copy to backend
cd frontend && ng build
cp -r dist/frontend/browser/* ../backend/public/

# Start production server
cd backend && npm start
```
