const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');
const mlRoutes = require('./routes/ml.routes');

const app = express();

const allowedOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:8083',
  'http://127.0.0.1:8083',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19002',
  'http://localhost:19005',
  'http://localhost:19006',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19001',
  'http://127.0.0.1:19002',
  'http://127.0.0.1:19006'
];
const originOption = process.env.NODE_ENV === 'production' ? allowedOrigins : true;

app.use(cors({
  origin: originOption,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-XSRF-TOKEN'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ml', mlRoutes);

const { db } = require('./config/firebase');

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RapidAid API is running' });
});

// api-prefixed health route for client-side checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RapidAid API (API prefix) is running' });
});

// Check Firestore from the backend using admin SDK
app.get('/api/health/firestore', async (req, res) => {
  try {
    if (!db) {
      return res.status(200).json({ status: 'skipped', message: 'Firestore not configured on server (set FIREBASE_* env variables)' });
    }
    const usersSnapshot = await db.collection('users').limit(1).get();
    res.json({ status: 'ok', message: 'Firestore reachable', count: usersSnapshot.size });
  } catch (error) {
    console.error('❌ Firestore health check failed:', error);
    res.status(500).json({ status: 'failed', message: 'Failed to reach Firestore', error: error.message });
  }
});

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'RapidAid API',
    version: '1.0.0',
    status: 'running',
    message: 'Welcome to RapidAid Emergency Medical Services API',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requires auth)'
      },
      patient: {
        emergency: 'POST /api/patient/emergency (requires auth)',
        getEmergency: 'GET /api/patient/emergency (requires auth)',
        profile: 'GET /api/patient/profile (requires auth)'
      },
      driver: {
        toggleDuty: 'POST /api/driver/duty/toggle (requires auth)',
        updateLocation: 'POST /api/driver/location (requires auth)',
        assignedRequests: 'GET /api/driver/requests/assigned (requires auth)'
      },
      admin: {
        drivers: 'GET /api/admin/drivers (requires auth)',
        patients: 'GET /api/admin/patients (requires auth)',
        emergencies: 'GET /api/admin/emergencies (requires auth)',
        dashboardMetrics: 'GET /api/admin/dashboard/metrics (requires auth)'
      }
    },
    documentation: 'See README.md for full API documentation'
  });
});

module.exports = app;

