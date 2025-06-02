const axios = require('axios');
const cheerio = require('cheerio'); // Still needed to parse HTML description from API
const Job = require('../db/models/Job.model');
const logger = require('../utils/logger');
const embeddingClient = require('../embeddingClient/embedding.client');
const { ApiError } = require('../middlewares/errorHandler');

const SOURCE_NAME = 'RemoteOK_API'; // Clear name for this source
const API_URL = 'https://remoteok.com/api';

// Helper function to add a delay (might not be strictly needed if API is robust, but good for DB operations)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRemoteOkAPI() {
  logger.info(`Starting job fetch for ${SOURCE_NAME} from ${API_URL}`);
  let jobsFoundInAPI = 0;
  let jobsAdded = 0;
  let jobsFailedToEmbed = 0;
  let jobsAlreadyExisted = 0;

  try {
    const { data: apiResponse } = await axios.get(API_URL, {
      headers: {
        'User-Agent': 'JobSenseApp/1.0 (Contact: your-email@example.com - for educational project)'
      },
      timeout: 20000 // 20 second timeout for API request
    });

    if (!Array.isArray(apiResponse) || apiResponse.length === 0) {
      logger.warn('RemoteOK API did not return an array or returned an empty array.');
      return { source: SOURCE_NAME, url: API_URL, jobsFound: 0, jobsAdded: 0, jobsAlreadyExisted: 0, jobsFailedToEmbed: 0, status: 'api_no_data' };
    }

    // The first element is often a legal notice, skip it.
    // Actual job listings start from the second element (index 1) if present.
    const jobEntries = apiResponse.slice(1);
    jobsFoundInAPI = jobEntries.length;
    logger.info(`Found ${jobsFoundInAPI} potential job listings from ${SOURCE_NAME} API.`);

    if (jobsFoundInAPI === 0) {
        logger.info(`No actual job entries found in API response after skipping legal notice.`);
    }

    for (let i = 0; i < jobEntries.length; i++) {
      const jobData = jobEntries[i];
      try {
        // Basic validation of essential fields from API
        if (!jobData.position || !jobData.company || !jobData.url || !jobData.description || !jobData.id) {
          logger.warn('Skipping an API job entry due to missing core fields (position, company, url, description, or id).', { id: jobData.id, position: jobData.position });
          continue;
        }

        const jobTitle = jobData.position;
        const companyName = jobData.company;
        const jobUrl = jobData.url; // This is the URL to the job on remoteok.com
        const htmlDescription = jobData.description; // HTML content
        const apiJobId = jobData.id.toString(); // Ensure it's a string

        // Clean the HTML description to get plain text for embedding
        let plainTextDescription = '';
        if (htmlDescription) {
            const $ = cheerio.load(`<body>${htmlDescription}</body>`); // Load HTML snippet
            $('script, style, a.button, .apply_now, form').remove(); // Remove common non-descriptive elements
            plainTextDescription = $('body').text().replace(/\s\s+/g, ' ').trim();
        }

        if (plainTextDescription.length < 50) { // Arbitrary short length
            logger.warn(`Parsed description for job "${jobTitle}" (${jobUrl}) is very short. Content may be minimal or primarily non-text. Length: ${plainTextDescription.length}`);
        }

        const existingJob = await Job.findOne({ url: jobUrl }); // Check by URL
        if (existingJob) {
          logger.debug(`Job from ${SOURCE_NAME} (URL: ${jobUrl}) already exists in DB, skipping.`);
          jobsAlreadyExisted++;
          continue;
        }
        
        const location = jobData.location || 'Remote'; // API might provide location
        const tagsFromApi = jobData.tags || [];
        const postedDate = jobData.date ? new Date(jobData.date) : (jobData.epoch ? new Date(jobData.epoch * 1000) : new Date());


        const textToEmbed = `${jobTitle} ${plainTextDescription}`;
        let jobEmbedding = [];
        if (plainTextDescription.trim()) { // Only embed if there's actual text
            try {
              jobEmbedding = await embeddingClient.getEmbedding(textToEmbed);
            } catch (embeddingError) {
              logger.error(`Failed to get embedding for API job "${jobTitle}" at ${jobUrl}. Error: ${embeddingError.message}.`);
              jobsFailedToEmbed++;
              // Decide: skip job entirely, or save without embedding? For now, save without.
            }
        } else {
            logger.warn(`Skipping embedding for API job "${jobTitle}" at ${jobUrl} due to empty parsed description.`);
        }


        const newJob = new Job({
          title: jobTitle,
          company: companyName,
          location: location,
          description: htmlDescription,       // Store raw HTML description from API
          parsedDescription: plainTextDescription, // Store plain text for embedding
          url: jobUrl,
          source: SOURCE_NAME,
          isRemote: true, // All jobs from RemoteOK are remote
          tags: tagsFromApi,
          experienceLevel: undefined, // API doesn't seem to provide this directly, could try to infer from tags/desc later
          embedding: jobEmbedding.length > 0 ? jobEmbedding : undefined,
          postedDate: postedDate,
          // sourceSpecificId: apiJobId, // Optional: if you want to store the API's own ID
        });

        await newJob.save();
        jobsAdded++;
        logger.info(`Added job from API: "${jobTitle}" at ${companyName}`);

        // Optional: small delay if processing many jobs to be nice to DB or other services
        if (i < jobEntries.length - 1 && (i % 10 === 0) ) { // e.g., delay every 10 jobs
            await delay(500); 
        }

      } catch (jobError) {
        logger.error(`Error processing one API job entry (ID: ${jobData.id}): ${jobError.message}`, { error: jobError, stack: jobError.stack });
      }
    }

    logger.info(`${SOURCE_NAME} API processing finished. Found in API: ${jobsFoundInAPI}, Added New: ${jobsAdded}, Already Existed: ${jobsAlreadyExisted}, Failed to Embed: ${jobsFailedToEmbed}.`);
    return {
        source: SOURCE_NAME,
        url: API_URL,
        jobsFound: jobsFoundInAPI,
        jobsAdded,
        jobsAlreadyExisted,
        jobsFailedToEmbed,
        status: 'success'
    };

  } catch (error) {
    logger.error(`Major error fetching or processing ${SOURCE_NAME} API: ${error.message}`, { stack: error.stack });
    if (error.isAxiosError && error.response) {
        logger.error(`Axios error details for ${API_URL}: Status ${error.response.status}`);
    }
    return { 
        source: SOURCE_NAME, 
        url: API_URL, 
        status: 'failed_api_request',
        error: error.message, 
        statusCode: error.isAxiosError && error.response ? error.response.status : 500,
        jobsFound: 0, jobsAdded: 0, jobsAlreadyExisted: 0, jobsFailedToEmbed: 0
    };
  }
}

module.exports = {
  fetchRemoteOkAPI, // Renamed function
  SOURCE_NAME,
};