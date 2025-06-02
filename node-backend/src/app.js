const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const { errorConverter, errorHandler, ApiError } = require('./middlewares/errorHandler');
const v1ApiRoutes = require('./routes'); // Import the main router
require('express-async-errors');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
// app.options('*', cors());

app.use((req, res, next) => {
  logger.debug(`REQ: ${req.method} ${req.originalUrl} ${req.ip}`);
  next();
});

app.get('/', (req, res) => {
  res.send(`JobSense Backend API is running in ${config.env} mode.`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount main API routes v1
app.use('/api/v1', v1ApiRoutes); // All API routes will be prefixed with /api/v1

// Example of throwing an ApiError (for testing the error handler)
// app.get('/error-test', (req, res) => {
//   throw new ApiError(400, 'This is a test API error!');
// });
// app.get('/server-error-test', (req, res) => {
//   throw new Error('This is a generic server error!');
// });


// TODO: Mount main API routes v1
// const v1Routes = require('./routes'); // Renaming for clarity
// app.use('/api/v1', v1Routes);

// Handle 404 Not Found for any other route AFTER actual routes
// IMPORTANT: This 404 handler must come BEFORE the global error handlers
app.use((req, res, next) => {
  next(new ApiError(404, 'Resource not found on this server.'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Global error handler
app.use(errorHandler);

module.exports = app;