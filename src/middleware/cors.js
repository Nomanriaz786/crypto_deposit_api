const cors = require('cors');
const config = require('../config');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.security.corsOrigin === '*') {
      return callback(null, true);
    }
    
    const allowedOrigins = Array.isArray(config.security.corsOrigin) 
      ? config.security.corsOrigin 
      : [config.security.corsOrigin];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

module.exports = cors(corsOptions);