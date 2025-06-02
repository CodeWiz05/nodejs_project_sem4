const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');

const embeddingServiceUrl = config.embeddingService.url;

if (!embeddingServiceUrl) {
  logger.error('FATAL ERROR: Embedding service URL is not configured in .env (EMBEDDING_SERVICE_URL).');
  // Depending on policy, you might throw an error here to prevent app startup
  // or allow it to run but log that embedding will fail.
  // For now, we've already checked this in config/index.js, so this is a double check.
}

/**
 * Gets an embedding vector for the given text from the Python embedding service.
 * @param {string} text - The text to embed.
 * @returns {Promise<Array<number>>} - A promise that resolves with the embedding vector (array of floats).
 * @throws {ApiError} - If the request fails or the service returns an error.
 */
const getEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    logger.warn('Attempted to get embedding for empty or invalid text.');
    // Or throw new ApiError(400, 'Text for embedding cannot be empty.');
    return []; // Or handle as an error appropriately
  }

  if (!embeddingServiceUrl) {
    logger.error('Embedding service URL is not configured. Cannot get embedding.');
    throw new ApiError(503, 'Embedding service is not configured or unavailable.');
  }

  try {
    logger.debug(`Requesting embedding for text (first 50 chars): "${text.substring(0, 50)}..."`);
    const response = await axios.post(
      embeddingServiceUrl,
      { text },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000, // 15 seconds timeout for embedding request (adjust as needed)
      }
    );

    if (response.status === 200 && response.data && response.data.embedding) {
      logger.debug(`Embedding received successfully. Vector dimension: ${response.data.embedding.length}`);
      return response.data.embedding;
    } else {
      logger.error('Invalid response structure from embedding service:', response.data);
      throw new ApiError(502, 'Received invalid response from the embedding service.');
    }
  } catch (error) {
    if (error.isAxiosError) {
      logger.error(`Axios error calling embedding service: ${error.message}`, {
        url: embeddingServiceUrl,
        status: error.response?.status,
        data: error.response?.data,
      });
      if (error.response) {
        // Error response from the service itself (e.g., 400, 500 from FastAPI)
        const serviceErrorMessage = error.response.data?.detail || error.response.data?.message || error.message;
        throw new ApiError(
          error.response.status || 502, // 502 Bad Gateway if service gives strange status
          `Embedding service error: ${serviceErrorMessage}`
        );
      } else if (error.request) {
        // Request was made but no response received (e.g., service down, network issue)
        throw new ApiError(503, 'Embedding service unavailable or timed out.');
      } else {
        // Something else happened in setting up the request
        throw new ApiError(500, `Error sending request to embedding service: ${error.message}`);
      }
    }
    // If it's already an ApiError or other type of error
    logger.error(`Non-Axios error during embedding request: ${error.message}`);
    throw error; // Re-throw
  }
};

module.exports = {
  getEmbedding,
};