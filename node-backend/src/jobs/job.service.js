const { allScrapers, scrapersBySource } = require('../scrapers'); // Ensure this path is correct
const logger = require('../utils/logger');                       // Ensure this path is correct
const Job = require('../db/models/Job.model');                 // Ensure this path is correct
const { ApiError } = require('../middlewares/errorHandler');     // Ensure this path is correct

/**
 * Triggers all registered scrapers or a specific one.
 * @param {string} [sourceName] - Optional name of a specific source to scrape.
 * @returns {Promise<Array<object>>} - Array of results from each scraper.
 */
const triggerScraping = async (sourceName) => {
  let scrapersToRun = [];
  if (sourceName) {
    if (scrapersBySource[sourceName]) {
      scrapersToRun.push(scrapersBySource[sourceName]);
      logger.info(`Triggering specific scraper for source: ${sourceName}`);
    } else {
      logger.warn(`No scraper found for source name: ${sourceName}`);
      return [{ source: sourceName, status: 'not_found', message: 'Scraper for this source does not exist.' }];
    }
  } else {
    scrapersToRun = allScrapers;
    logger.info(`Triggering all ${allScrapers.length} registered scrapers.`);
  }

  if (scrapersToRun.length === 0) {
    logger.info('No scrapers to run.');
    return [{ status: 'no_scrapers', message: 'No scrapers configured or specified to run.' }];
  }

  const results = [];
  for (const scrapeFn of scrapersToRun) {
    try {
      const result = await scrapeFn(); // scrapeFn is async
      results.push({ status: 'success', ...result });
    } catch (error) {
      logger.error(`Error executing scraper function ${scrapeFn.name || scrapeFn._sourceName || 'anonymous_scraper'}: ${error.message}`);
      results.push({
        scraperName: scrapeFn.name || scrapeFn._sourceName || 'anonymous_scraper', // Attempt to get source
        status: 'failed',
        error: error.message,
        // stack: error.stack // Avoid exposing full stack in API for production
      });
    }
  }
  logger.info('All scraping tasks initiated have completed or failed.');
  return results;
};


/**
 * Gets jobs from the database with filtering and pagination.
 * @param {object} filters - Object containing filter criteria.
 * @param {object} paginationOptions - Object for pagination (e.g., page, limit).
 * @returns {Promise<{jobs: Array<Job>, totalJobs: number, totalPages: number, currentPage: number, limit: number}>}
 */
const getJobs = async (filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
    const { isRemote, experienceLevel, title, company, location, source, searchTerm } = filters; // Added searchTerm
    const { page, limit } = paginationOptions;

    const query = {};
    const findConditions = [];


    if (typeof isRemote === 'boolean') {
        findConditions.push({ isRemote: isRemote });
    }
    if (experienceLevel) {
        findConditions.push({ experienceLevel: { $regex: new RegExp(experienceLevel, 'i') } });
    }
    if (title) {
        findConditions.push({ title: { $regex: new RegExp(title, 'i') } });
    }
    if (company) {
        findConditions.push({ company: { $regex: new RegExp(company, 'i') } });
    }
    if (location) {
        findConditions.push({ location: { $regex: new RegExp(location, 'i') } });
    }
    if (source) {
        findConditions.push({ source: { $regex: new RegExp(source, 'i') } });
    }

    // If there's a general search term, apply it to multiple fields
    // For more advanced text search, MongoDB's $text operator with a text index is better.
    // This is a simpler regex-based multi-field search.
    if (searchTerm) {
        const searchRegex = { $regex: new RegExp(searchTerm, 'i') };
        findConditions.push({
            $or: [
                { title: searchRegex },
                { company: searchRegex },
                { parsedDescription: searchRegex }, // Search in parsedDescription
                { tags: searchRegex } // Search if tags array contains the term
            ]
        });
    }
    
    if (findConditions.length > 0) {
        query.$and = findConditions;
    }


    try {
        const skip = (page - 1) * limit;
        const jobs = await Job.find(query)
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(limit)
            .select('-embedding -description'); // Exclude large fields by default

        const totalJobs = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / limit);

        return {
            jobs,
            totalJobs,
            totalPages,
            currentPage: page,
            limit
        };
    } catch (error) {
        logger.error('Error fetching jobs from database:', error);
        throw new ApiError(500, 'Failed to retrieve jobs.');
    }
};


module.exports = {
  triggerScraping,
  getJobs,
};