const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import configuration
const config = require('./src/config');

// Import middleware
const {
  corsMiddleware,
  errorHandler,
  generalLimiter,
  requestLogger,
  securityHeaders,
  healthCheck
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
    console.log(`Server running on port ${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api`);
  });
}

// Export for Vercel
module.exports = app;