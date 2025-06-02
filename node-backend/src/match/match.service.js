const Job = require('../db/models/Job.model');
const { cosineSimilarity } = require('../utils/cosineSimilarity');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Matches a resume embedding against stored job embeddings.
 * @param {number[]} resumeEmbedding - The embedding vector of the resume.
 * @param {number} topN - The number of top matches to return.
 * @param {object} userPreferences - Filters for jobs (e.g., isRemote).
 * @returns {Promise<Array<object>>} - Sorted list of matched jobs with scores.
 */
const findMatchingJobs = async (resumeEmbedding, topN = 10, userPreferences = {}) => {
  if (!resumeEmbedding || resumeEmbedding.length === 0) {
    throw new ApiError(400, 'Resume embedding is required for matching.');
  }

  const query = { ...userPreferences };
  query.embedding = { $exists: true, $ne: [], $size: 384 }; // Match jobs with valid 384-dim embeddings

  logger.debug('Fetching jobs for matching with preferences:', query);
  // Select fields needed for display + embedding for calculation
  const jobs = await Job.find(query)
                        .select('title company location url source isRemote tags embedding parsedDescription') 
                        .lean(); 

  if (jobs.length === 0) {
    logger.info('No jobs found matching the criteria for comparison.');
    return [];
  }
  logger.info(`Comparing resume against ${jobs.length} jobs.`);

  const scoredJobs = jobs
    .map(job => {
      // job.embedding should exist due to query filter, but double check for safety
      if (!job.embedding || job.embedding.length !== 384) {
        logger.warn(`Job ${job._id} (${job.title}) missing valid embedding, skipping in match.`);
        return { ...job, similarityScore: -1 }; // Assign low score to filter out
      }
      const score = cosineSimilarity(resumeEmbedding, job.embedding);
      return {
        // Select fields to return for matched jobs
        _id: job._id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        source: job.source,
        isRemote: job.isRemote,
        tags: job.tags,
        parsedDescriptionSnippet: job.parsedDescription ? job.parsedDescription.substring(0, 200) + '...' : 'N/A',
        similarityScore: parseFloat(score.toFixed(4)),
      };
    })
    .filter(job => job.similarityScore >= 0.3) // Optional: threshold for minimum similarity (0.3 is a guess, adjust)
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return scoredJobs.slice(0, topN);
};

module.exports = { findMatchingJobs };