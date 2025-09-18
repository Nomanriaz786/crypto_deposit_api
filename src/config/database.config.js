const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payments',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferMaxEntries: 0 // Disable mongoose buffering
  }
};

module.exports = config;