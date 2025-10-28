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

  // NOWPayments Configuration for different categories
  nowPayments: {
    categories: {
      packages: {
        apiKey: process.env.NOWPAYMENTS_API_KEY_PACKAGES,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET_PACKAGES,
        authEmail: process.env.NOWPAYMENTS_AUTH_EMAIL_PACKAGES,
        authPassword: process.env.NOWPAYMENTS_AUTH_PASSWORD_PACKAGES,
        twoFaSecret: process.env.NOWPAYMENTS_2FA_SECRET_PACKAGES, // For automatic payout verification
        collection: 'payments',
        withdrawalCollection: 'withdrawals'
      },
      matrix: {
        apiKey: process.env.NOWPAYMENTS_API_KEY_MATRIX,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET_MATRIX,
        authEmail: process.env.NOWPAYMENTS_AUTH_EMAIL_MATRIX,
        authPassword: process.env.NOWPAYMENTS_AUTH_PASSWORD_MATRIX,
        twoFaSecret: process.env.NOWPAYMENTS_2FA_SECRET_MATRIX, // For automatic payout verification
        collection: 'matrix_payments',
        withdrawalCollection: 'matrix_withdrawals'
      },
      lottery: {
        apiKey: process.env.NOWPAYMENTS_API_KEY_LOTTERY,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET_LOTTERY,
        authEmail: process.env.NOWPAYMENTS_AUTH_EMAIL_LOTTERY,
        authPassword: process.env.NOWPAYMENTS_AUTH_PASSWORD_LOTTERY,
        twoFaSecret: process.env.NOWPAYMENTS_2FA_SECRET_LOTTERY, // For automatic payout verification
        collection: 'lottery_payments',
        withdrawalCollection: 'lottery_withdrawals'
      },
      passive_income: {
        apiKey: process.env.NOWPAYMENTS_API_KEY_PASSIVE_INCOME,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET_PASSIVE_INCOME,
        authEmail: process.env.NOWPAYMENTS_AUTH_EMAIL_PASSIVE_INCOME,
        authPassword: process.env.NOWPAYMENTS_AUTH_PASSWORD_PASSIVE_INCOME,
        twoFaSecret: process.env.NOWPAYMENTS_2FA_SECRET_PASSIVE_INCOME, // For automatic payout verification
        collection: 'passive_income_payments',
        withdrawalCollection: 'passive_income_withdrawals'
      }
    },
    // Legacy configuration for backward compatibility
    apiKey: process.env.NOWPAYMENTS_SANDBOX === 'true' 
      ? process.env.NOWPAYMENTS_SANDBOX_API_KEY 
      : process.env.NOWPAYMENTS_API_KEY_PACKAGES, // Default to packages
    ipnSecret: process.env.NOWPAYMENTS_SANDBOX === 'true'
      ? process.env.NOWPAYMENTS_SANDBOX_IPN_SECRET
      : process.env.NOWPAYMENTS_IPN_SECRET_PACKAGES, // Default to packages
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
  // Only require API key for sandbox, IPN secret is optional
  requiredEnvVars.push('NOWPAYMENTS_SANDBOX_API_KEY');
} else {
  // Production requires scenario-specific credentials
  requiredEnvVars.push(
    'NOWPAYMENTS_API_KEY_PACKAGES',
    'NOWPAYMENTS_IPN_SECRET_PACKAGES',
    'NOWPAYMENTS_AUTH_EMAIL_PACKAGES',
    'NOWPAYMENTS_AUTH_PASSWORD_PACKAGES',
    'NOWPAYMENTS_API_KEY_MATRIX',
    'NOWPAYMENTS_IPN_SECRET_MATRIX',
    'NOWPAYMENTS_AUTH_EMAIL_MATRIX',
    'NOWPAYMENTS_AUTH_PASSWORD_MATRIX',
    'NOWPAYMENTS_API_KEY_LOTTERY',
    'NOWPAYMENTS_IPN_SECRET_LOTTERY',
    'NOWPAYMENTS_AUTH_EMAIL_LOTTERY',
    'NOWPAYMENTS_AUTH_PASSWORD_LOTTERY',
    'NOWPAYMENTS_API_KEY_PASSIVE_INCOME',
    'NOWPAYMENTS_IPN_SECRET_PASSIVE_INCOME',
    'NOWPAYMENTS_AUTH_EMAIL_PASSIVE_INCOME',
    'NOWPAYMENTS_AUTH_PASSWORD_PASSIVE_INCOME'
  );
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

module.exports = config;

// Helper function to get category configuration
config.getCategoryConfig = (category) => {
  const categoryConfig = config.nowPayments.categories[category];
  if (!categoryConfig) {
    throw new Error(`Invalid category: ${category}. Valid categories: ${Object.keys(config.nowPayments.categories).join(', ')}`);
  }
  
  // In sandbox mode, use sandbox credentials regardless of category
  if (config.nowPayments.isSandbox) {
    return {
      apiKey: config.nowPayments.apiKey, // This will be the sandbox API key
      ipnSecret: config.nowPayments.ipnSecret, // This will be the sandbox IPN secret
      authEmail: process.env.NOWPAYMENTS_SANDBOX_AUTH_EMAIL_PASSIVE_INCOME, // Sandbox auth email for withdrawals
      authPassword: process.env.NOWPAYMENTS_SANDBOX_AUTH_PASSWORD_PASSIVE_INCOME, // Sandbox auth password for withdrawals
      collection: categoryConfig.collection,
      withdrawalCollection: categoryConfig.withdrawalCollection,
      baseUrl: config.nowPayments.baseUrl,
      isSandbox: config.nowPayments.isSandbox
    };
  }
  
  // In production, use category-specific credentials
  return {
    ...categoryConfig,
    baseUrl: config.nowPayments.baseUrl,
    isSandbox: config.nowPayments.isSandbox
  };
};

// Helper function to get collection name for category
config.getCollectionForCategory = (category) => {
  const categoryConfig = config.getCategoryConfig(category);
  return categoryConfig.collection;
};

// Helper function to get withdrawal collection name for category
config.getWithdrawalCollectionForCategory = (category) => {
  const categoryConfig = config.getCategoryConfig(category);
  return categoryConfig.withdrawalCollection;
};

// Helper function to detect category based on package names for deposits
config.detectCategoryFromPackageNames = (requestData) => {
  // Define package names that map to the 'packages' category
  const packageCategoryNames = [
    'Starter Package',
    'Basic Package',
    'Standard Package',
    'Pro Package',
    'Elite Package',
    'Premium Package',
    'Ultimate Package'
  ];

  // Check if the category field contains a package name
  if (requestData.category && typeof requestData.category === 'string') {
    if (packageCategoryNames.includes(requestData.category)) {
      return 'packages';
    }
  }

  return null;
};