const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',

  // NOWPayments Configuration
  nowPayments: {
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    baseUrl: 'https://api.nowpayments.io/v1',
    sandboxUrl: 'https://api-sandbox.nowpayments.io/v1'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payments'
  },

  // Security Configuration
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100 // limit each IP to 100 requests per windowMs
  },

  // Application Configuration
  app: {
    defaultCurrency: 'usd',
    paymentTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    webhookRetries: 3
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'NOWPAYMENTS_API_KEY',
  'MONGODB_URI'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

module.exports = config;