const connectDB = require('../config/database');

/**
 * Middleware to ensure database connection before processing requests
 * This is especially useful for serverless environments
 */
const ensureDBConnection = async (req, res, next) => {
  try {
    // Skip database connection for routes that don't need database access
    const nonDBRoutes = ['/health', '/status', '/currencies', '/estimate', '/minimum-amount'];
    const skipDB = nonDBRoutes.some(route => req.path.includes(route)) || 
                   req.path === '/api' || 
                   req.path === '/';

    if (skipDB) {
      return next();
    }

    // Try to connect to database for routes that need it
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error.message);
    
    // Return error response instead of crashing
    return res.status(503).json({
      success: false,
      error: 'Database connection unavailable',
      message: 'Please try again in a moment',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = ensureDBConnection;