const jobService = require('./job.service');
const logger = require('../utils/logger');
// const { ApiError } = require('../middlewares/errorHandler'); // Not explicitly used here, but good to have if needed

const scrapeJobsController = async (req, res) => {
  const sourceName = req.query.source; // e.g. /scrape?source=WeWorkRemotely
  logger.info(`Scrape jobs request received. Source: ${sourceName || 'all available'}`);

  const results = await jobService.triggerScraping(sourceName);

  const hasFailures = results.some(r => r.status === 'failed');
  const allFailed = results.every(r => r.status === 'failed');
  const allNotFound = results.every(r => r.status === 'not_found' || r.status === 'no_scrapers');

  let httpStatus = 200;
  let success = true;
  let message = 'Scraping process completed.';

  if (allNotFound) {
    httpStatus = 404;
    success = false;
    message = 'No scrapers found or specified.';
  } else if (allFailed && results.length > 0) {
    httpStatus = 500; // Or 502 if it's more about upstream scraper failures
    success = false;
    message = 'All scraping attempts failed.';
  } else if (hasFailures) {
    httpStatus = 207; // Multi-Status
    success = true; // Overall operation initiated, some parts might have succeeded
    message = 'Scraping process completed with some errors. See details.';
  }


  res.status(httpStatus).json({
    success,
    message,
    data: results,
  });
};

const getJobsController = async (req, res) => {
    // Extract query parameters for filtering and pagination
    const { isRemote, experienceLevel, title, company, location, source, searchTerm, page, limit } = req.query;
    
    const filters = {
        isRemote: isRemote ? (isRemote.toLowerCase() === 'true') : undefined,
        experienceLevel,
        title,
        company,
        location,
        source,
        searchTerm
    };
    // Remove undefined/null filter values to avoid passing them to the service
    Object.keys(filters).forEach(key => (filters[key] === undefined || filters[key] === null) && delete filters[key]);

    const paginationOptions = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
    };
    if (paginationOptions.limit <= 0) paginationOptions.limit = 10; // Ensure positive limit
    if (paginationOptions.limit > 100) paginationOptions.limit = 100; // Max limit
    if (paginationOptions.page <= 0) paginationOptions.page = 1; // Ensure positive page

    logger.debug('Fetching jobs with controller filters:', { filters, paginationOptions });
    const result = await jobService.getJobs(filters, paginationOptions);

    res.status(200).json({
        success: true,
        message: 'Jobs retrieved successfully.',
        data: result.jobs,
        meta: {
            totalItems: result.totalJobs, // Renamed for clarity
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            itemsPerPage: result.limit,   // Renamed for clarity
        }
    });
};

module.exports = {
  scrapeJobsController,
  getJobsController,
};