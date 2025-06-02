const matchService = require('./match.service');
const embeddingClient = require('../embeddingClient/embedding.client');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

const matchJobsController = async (req, res) => {
  const { resumeText, resumeEmbedding, topN, preferences } = req.body;
  let finalResumeEmbedding = resumeEmbedding;

  if (!finalResumeEmbedding && resumeText) {
    if (typeof resumeText !== 'string' || resumeText.trim().length < 10) { // Min length for meaningful text
        throw new ApiError(400, 'Resume text is too short or invalid.');
    }
    logger.info('No resume embedding provided, generating from text...');
    try {
        finalResumeEmbedding = await embeddingClient.getEmbedding(resumeText);
    } catch (embedError) {
        logger.error('Failed to generate resume embedding during match request:', embedError);
        throw new ApiError(500, `Could not generate embedding for the provided resume text: ${embedError.message}`);
    }
  }

  if (!finalResumeEmbedding || !Array.isArray(finalResumeEmbedding) || finalResumeEmbedding.length !== 384) {
    throw new ApiError(400, 'A valid 384-dimension resume embedding (from "resumeEmbedding" field) or sufficient "resumeText" must be provided.');
  }

  const numMatches = parseInt(topN, 10) || 10;
  const userPrefsInput = preferences || {};
  
  // Sanitize user preferences if needed, e.g., convert 'true'/'false' strings
  const userPrefs = {};
  if (userPrefsInput.isRemote !== undefined) {
    userPrefs.isRemote = String(userPrefsInput.isRemote).toLowerCase() === 'true';
  }
  // Add other preference sanitization here if needed

  logger.info(`Matching jobs. TopN: ${numMatches}, Prefs: ${JSON.stringify(userPrefs)}`);
  const matchedJobs = await matchService.findMatchingJobs(finalResumeEmbedding, numMatches, userPrefs);

  if (matchedJobs.length === 0) {
    return res.status(200).json({ // Still a successful request, just no matches found
        success: true,
        message: 'No matching jobs found based on the criteria and resume.',
        data: [],
    });
  }

  res.status(200).json({
    success: true,
    message: `Found ${matchedJobs.length} potential job matches.`,
    data: matchedJobs,
  });
};

module.exports = { matchJobsController };