const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',

  // Firebase/Firestore Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  },

  // NOWPayments Configuration
  nowPayments: {
    // Use sandbox or production credentials based on NOWPAYMENTS_SANDBOX flag
    apiKey: process.env.NOWPAYMENTS_SANDBOX === 'true' 
      ? process.env.NOWPAYMENTS_SANDBOX_API_KEY 
      : process.env.NOWPAYMENTS_API_KEY,
    ipnSecret: process.env.NOWPAYMENTS_SANDBOX === 'true'
      ? process.env.NOWPAYMENTS_SANDBOX_IPN_SECRET
      : process.env.NOWPAYMENTS_IPN_SECRET,
    baseUrl: process.env.NOWPAYMENTS_SANDBOX === 'true' 
      ? 'https://api-sandbox.nowpayments.io/v1'
      : 'https://api.nowpayments.io/v1',
    sandboxUrl: 'https://api-sandbox.nowpayments.io/v1',
    productionUrl: 'https://api.nowpayments.io/v1',
    isSandbox: process.env.NOWPAYMENTS_SANDBOX === 'true'
  },

  // Security Configuration
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMax: 100
  },

  // Application Configuration
  app: {
    defaultCurrency: 'usd',
    paymentTimeout: 24 * 60 * 60 * 1000,
    webhookRetries: 3
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

// Add NOWPayments credentials based on sandbox mode
if (process.env.NOWPAYMENTS_SANDBOX === 'true') {
  requiredEnvVars.push('NOWPAYMENTS_SANDBOX_API_KEY', 'NOWPAYMENTS_SANDBOX_IPN_SECRET');
} else {
  requiredEnvVars.push('NOWPAYMENTS_API_KEY', 'NOWPAYMENTS_IPN_SECRET');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

module.exports = config;