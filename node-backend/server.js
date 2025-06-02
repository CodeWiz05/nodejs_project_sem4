const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const connectDB = require('./src/db/connect');

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the Express server
    server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Access it at http://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

const unexpectedErrorHandler = (error) => {
  logger.error('UNHANDLED ERROR:', error);
  if (server) {
    server.close(() => {
      logger.info('Server closed due to unhandled error');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('Server closed.');
      // mongoose.connection.close(false, () => { // Mongoose 6+ doesn't need callback
      mongoose.connection.close().then(() => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      }).catch(err => {
        logger.error('Error closing MongoDB connection during SIGTERM:', err);
        process.exit(1);
      });
    });
  } else {
    process.exit(0);
  }
});