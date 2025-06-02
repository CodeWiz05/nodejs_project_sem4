const resumeService = require('./resume.service');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const embeddingClient = require('../embeddingClient/embedding.client'); // Import the client

const uploadAndParseResume = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No resume file uploaded. Please upload a PDF file under the field "resumeFile".');
  }

  logger.info(`Received resume file: ${req.file.originalname}, size: ${req.file.size} bytes`);

  const pdfBuffer = req.file.buffer;
  const resumeText = await resumeService.parsePdfResume(pdfBuffer);

  if (!resumeText || resumeText.trim().length === 0) {
    logger.warn(`Resume parsed but no text content found for file: ${req.file.originalname}`);
    return res.status(200).json({
      success: true,
      message: 'Resume processed. Warning: No text content extracted.',
      data: {
        originalFilename: req.file.originalname,
        parsedText: '',
        resumeEmbedding: [], // Return empty array for embedding if no text
      },
    });
  }

  // Get embedding for the parsed resume text
  let resumeEmbedding = [];
  try {
    resumeEmbedding = await embeddingClient.getEmbedding(resumeText);
    if (!resumeEmbedding || resumeEmbedding.length === 0) {
        logger.warn(`Embedding for resume '${req.file.originalname}' was empty. This might happen if the text was too short or the embedding service had an issue with it.`);
        // Decide if this is a critical error. For now, proceed but log.
    }
  } catch (error) {
    // Log the error but don't necessarily fail the whole request if embedding fails,
    // unless it's critical. For now, we'll proceed without the embedding and log.
    // The error would have already been logged by embeddingClient.
    logger.error(`Failed to get embedding for resume '${req.file.originalname}'. Proceeding without embedding. Error: ${error.message}`);
    // If embedding is CRITICAL, you might re-throw or throw a new ApiError here:
    // throw new ApiError(500, `Could not generate embedding for the resume: ${error.message}`);
  }

  res.status(200).json({
    success: true,
    message: 'Resume uploaded, parsed, and processed for embedding.',
    data: {
      originalFilename: req.file.originalname,
      parsedText: resumeText,
      resumeEmbedding: resumeEmbedding, // Include the embedding (or empty array if failed/empty)
      embeddingDimension: resumeEmbedding.length, // Useful for quick check
    },
  });
};

module.exports = {
  uploadAndParseResume,
};