const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const migrate = require('./db/migrate');

// Route handlers
const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const attendanceRoutes = require('./routes/attendance');
const messageRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const feeRoutes = require('./routes/fees');

const app = express();

// Security and utility middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: config.whatsapp.provider,
    institute: config.institute.name
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/fees', feeRoutes);

// Optional Single-Server Mode: Serve React frontend static build directly from Express
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  console.log(`📦 Serving React frontend bundle from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Start Server & Initialize Database
async function startServer() {
  try {
    // Run database migrations / seed data initialization
    await migrate();

    app.listen(config.port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Apex Institute Backend running on port ${config.port}`);
      console.log(`📱 WhatsApp Provider: [${config.whatsapp.provider.toUpperCase()}]`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/health`);
      console.log(`🔑 Admin Login: admin@apex.com / admin123`);
      console.log(`🔑 Teacher Login: rahul@apex.com / teacher123`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Fatal: Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
