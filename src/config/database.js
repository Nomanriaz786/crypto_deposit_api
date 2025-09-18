const mongoose = require('mongoose');
const config = require('./database.config');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(config.mongoUri, config.options);

    isConnected = conn.connections[0].readyState;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
  isConnected = false;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;