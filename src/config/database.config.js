const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payments',
  options: {
    maxPoolSize: 10, 
    serverSelectionTimeoutMS: 5000
  }
};

module.exports = config;