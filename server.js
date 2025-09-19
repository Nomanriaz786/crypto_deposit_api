const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import configuration
const config = require('./src/config');

// Import database connection
const connectDB = require('./src/config/database');

// Import middleware
const {
  corsMiddleware,
  errorHandler,
  generalLimiter,
  requestLogger,
  securityHeaders,
  healthCheck,
  ensureDBConnection
} = require('./src/middleware');

// Import routes
const paymentRoutes = require('./src/routes/payments');
const userRoutes = require('./src/routes/users');
const webhookRoutes = require('./src/routes/webhooks');
const utilityRoutes = require('./src/routes');

// Create Express application
const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Apply security headers
app.use(securityHeaders);

// Apply CORS
app.use(corsMiddleware);

// Request logging (only in development)
if (config.nodeEnv === 'development') {
  app.use(requestLogger);
}

// Health check middleware (before body parser for efficiency)
app.use(healthCheck);

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', generalLimiter);

// Database connection middleware (for routes that need DB)
app.use('/api', ensureDBConnection);

// Connect to database (with error handling for serverless)
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    // Don't exit in serverless environment, just log the error
  }
};

// Initialize database connection
if (process.env.NODE_ENV === 'development') {
  initializeDatabase();
} else {
  // In production/serverless, connect on first API call
  console.log('Database will connect on first API call');
}

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api', utilityRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Deposit API',
    version: '2.0.0',
    documentation: '/api',
    health: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  });
}

// Export for Vercel
module.exports = app;