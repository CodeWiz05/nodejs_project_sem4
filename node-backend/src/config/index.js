const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the root of node-backend
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongo: {
    uri: process.env.MONGO_URI,
    options: {
      // useNewUrlParser: true, // Deprecated in Mongoose 6+
      // useUnifiedTopology: true, // Deprecated in Mongoose 6+
      // useCreateIndex: true, // Deprecated
      // useFindAndModify: false, // Deprecated
    },
  },
  embeddingService: {
    url: process.env.EMBEDDING_SERVICE_URL,
  },
  email: {
    smtp: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: (process.env.EMAIL_PORT === '465'), // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    },
    from: process.env.EMAIL_FROM,
  },
  // Add other configurations as needed
};

// Validate essential configurations
if (!config.mongo.uri) {
  throw new Error('FATAL ERROR: MONGO_URI is not defined in .env file');
}
if (!config.embeddingService.url) {
  throw new Error('FATAL ERROR: EMBEDDING_SERVICE_URL is not defined in .env file');
}

module.exports = config;