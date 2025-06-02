const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    logger.info('MongoDB Connected Successfully!');

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected.');
    });

  } catch (error) {
    logger.error('MongoDB Connection Failed:', error.message);
    // Exit process with failure if initial connection fails
    process.exit(1);
  }
};

module.exports = connectDB;