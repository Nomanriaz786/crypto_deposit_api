const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import configuration
const config = require('./config');

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const {
  corsMiddleware,
  errorHandler,
  generalLimiter,
  requestLogger,
  securityHeaders,
  healthCheck
} = require('./middleware');

// Import routes
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const webhookRoutes = require('./routes/webhooks');
const utilityRoutes = require('./routes');

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

// Connect to database
connectDB();

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

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server only in non-production environment (Vercel handles this in production)
let server;
if (config.nodeEnv !== 'production') {
  server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`📖 API Documentation: http://localhost:${config.port}/api`);
    console.log(`🏥 Health Check: http://localhost:${config.port}/api/health`);
  });
}

module.exports = app;