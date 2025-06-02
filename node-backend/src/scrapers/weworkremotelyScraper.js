const axios = require('axios');
const cheerio = require('cheerio');
const Job = require('../db/models/Job.model');
const logger = require('../utils/logger');
const embeddingClient = require('../embeddingClient/embedding.client');
const { ApiError } = require('../middlewares/errorHandler');

const SOURCE_NAME = 'WeWorkRemotely';
const BASE_URL = 'https://weworkremotely.com';
// Scrape "All recent remote jobs" page
const TARGET_CATEGORY_PATH = '/remote-jobs/search';
// OR, to scrape a specific category, you could change it to, e.g.:
// const TARGET_CATEGORY_PATH = '/categories/remote-full-stack-programming-jobs';


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJobDetailDescription(jobDetailUrl) {
  try {
    logger.debug(`Fetching job detail from: ${jobDetailUrl}`);
    const { data: detailHtml } = await axios.get(jobDetailUrl, {
      headers: { // It's good practice to set a User-Agent
        'User-Agent': 'JobSenseScraper/1.0 (Contact: yourname@example.com - for educational project)'
      }
    });
    const $ = cheerio.load(detailHtml);

    // ***** REFINED SELECTOR FOR JOB DESCRIPTION ON DETAIL PAGE *****
    let descriptionHtml = $('div.lis-container__job__content__description').html();
    let descriptionText = '';

    if (descriptionHtml) {
        const $desc = cheerio.load(`<body>${descriptionHtml}</body>`); // Wrap for robust parsing
        // Remove elements that are often inside the description but not part of it, like "Apply Now" sections or tracking pixels
        $desc('script, style, .lis-container__job__content__apply, img[src*="jobg8.com"]').remove();
        descriptionText = $desc('body').text().replace(/\s\s+/g, ' ').trim(); // Normalize whitespace
    } else {
        // Fallback if the primary selector fails - this indicates a structure change or unexpected page
        logger.warn(`Primary description selector 'div.lis-container__job__content__description' failed for ${jobDetailUrl}. Trying broader selectors.`);
        descriptionHtml = $('section.lis-container__job').html(); // Broader section
        if (descriptionHtml) {
            const $desc = cheerio.load(`<body>${descriptionHtml}</body>`);
            $desc('script, style, .lis-container__job__content__apply, .lis-container__job__sidebar, img[src*="jobg8.com"]').remove();
            descriptionText = $desc('body').text().replace(/\s\s+/g, ' ').trim();
        } else {
            logger.warn(`Could not find any job description HTML container for ${jobDetailUrl}.`);
        }
    }
    
    if (!descriptionText && descriptionHtml) {
      logger.warn(`Extracted HTML for description from ${jobDetailUrl} but text content was empty after parsing. Check removed elements or inner structure of description block.`);
    } else if (!descriptionText && !descriptionHtml) {
      logger.warn(`No description HTML or text extracted from ${jobDetailUrl}.`);
    }

    return { html: descriptionHtml || '', text: descriptionText };
  } catch (error) {
    logger.error(`Error fetching or parsing job detail page ${jobDetailUrl}: ${error.message}`);
    if (error.isAxiosError && error.response) {
        logger.error(`Axios error details: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data).substring(0,200)}`);
    }
    return { html: '', text: '' };
  }
}


async function scrapeWeWorkRemotely() {
  const fullListingPageUrl = `${BASE_URL}${TARGET_CATEGORY_PATH}`;
  logger.info(`Starting scrape for ${SOURCE_NAME} from ${fullListingPageUrl}`);
  let jobsFoundOnPage = 0;
  let jobsAdded = 0;
  let jobsFailedToEmbed = 0;
  let jobsAlreadyExisted = 0;

  try {
    const { data: listPageHtml } = await axios.get(fullListingPageUrl, {
      headers: {
        'User-Agent': 'JobSenseScraper/1.0 (Contact: snumairsoharwardi_cse2305j0@mgit.ac.in - for educational project)'
      }
    });
    const $ = cheerio.load(listPageHtml);

    // ***** REFINED SELECTOR FOR JOB ITEMS ON THE LISTING PAGE *****
    // Based on provided HTML, each job is an <li> with class "new-listing-container"
    // These are found within <section class="jobs"> <ul> ... </ul>
    const jobElements = $('section.jobs ul li.new-listing-container'); 
    jobsFoundOnPage = jobElements.length;
    logger.info(`Found ${jobsFoundOnPage} potential job listings on ${fullListingPageUrl}.`);

    if (jobsFoundOnPage === 0) {
        logger.warn(`No job listings found with selector 'section.jobs ul li.new-listing-container' on ${fullListingPageUrl}. The website structure might have changed or the page is different than expected.`);
    }

    for (let i = 0; i < jobElements.length; i++) {
      const jobItemElement = jobElements.eq(i); // Current <li> element
      try {
        // The main link to the job detail page is usually the first <a> child of the <li>,
        // or an <a> that wraps the primary content within the <li>.
        // We're looking for hrefs that typically start with /listings/ or /remote-jobs/
        const linkElement = jobItemElement.find('a[href^="/listings/"], a[href^="/remote-jobs/"]').first();
        
        if (linkElement.length === 0) {
            logger.warn('Could not find primary job link element within li.new-listing-container. Skipping item.');
            if(jobItemElement.html()) logger.debug(`Problematic HTML snippet (no link): ${jobItemElement.html().substring(0, 300)}...`);
            continue;
        }

        const relativeJobUrl = linkElement.attr('href');
        // Extract title and company from within this linkElement, as it wraps them
        const jobTitle = linkElement.find('h4.new-listing__header__title').text().trim();
        const companyName = linkElement.find('p.new-listing__company-name').first().text().trim(); // .first() to be safe
        logger.info(`--- ITEM ${i} ---`);
        logger.info(`TITLE: ${jobTitle}`);
        logger.info(`COMPANY: ${companyName}`);
        logger.info(`RELATIVE URL: ${relativeJobUrl}`);
        logger.debug(`ITEM HTML (first 300 chars): ${jobItemElement.html() ? jobItemElement.html().substring(0,300) : 'N/A'}`); // Optional: for debugging HTML
        await delay(100);

        //if (!jobTitle || !companyName || !relativeJobUrl) {
           // logger.warn(`Skipping a listing from WWR due to missing title, company, or relative URL. Title: '${jobTitle}', Company: '${companyName}', RelURL: '${relativeJobUrl}'`);
            //if(jobItemElement.html()) logger.debug(`Problematic HTML snippet (missing data): ${jobItemElement.html().substring(0, 300)}...`);
            //continue;
        //}
        
        //const fullJobDetailUrl = `${BASE_URL}${relativeJobUrl}`;

        //const existingJob = await Job.findOne({ url: fullJobDetailUrl });
        //if (existingJob) {
          //logger.debug(`Job from ${SOURCE_NAME} already exists in DB, skipping: ${fullJobDetailUrl}`);
          //jobsAlreadyExisted++;
          //continue;
        //}

        // Fetch full description from detail page
        //const { html: descriptionHtml, text: descriptionText } = await fetchJobDetailDescription(fullJobDetailUrl);
        
        // Polite delay *after* fetching the detail page, before the next detail page fetch or DB operations
        //if (i < jobElements.length - 1) { // Avoid delay after the very last item
          //  await delay(1500 + Math.floor(Math.random() * 1000)); // 1.5 to 2.5 seconds
        //}

        //if (!descriptionText && !descriptionHtml) {
          //  logger.warn(`No description found for ${fullJobDetailUrl} after fetching detail page. This job may not be suitable or complete. Skipping.`);
            //continue;
        //}
        
        //const categories = [];
        // Categories are within the same linkElement context on the listing page
        //linkElement.find('div.new-listing__categories p.new-listing__categories__category').each((idx, tagEl) => {
            //const tagText = $(tagEl).text().trim();
            //if (tagText) categories.push(tagText);
        //});
        
        //let location = 'Remote'; // WWR is all remote
        //const companyHeadquarters = linkElement.find('p.new-listing__company-headquarters').text().trim();
        // You might decide to use companyHeadquarters as location if specific remote region tags aren't present
        //const regionTag = categories.find(c => c.match(/(europe|americas|asia|africa|canada|usa)/i));
        //if (regionTag) {
          //  location = regionTag;
        //} else if (companyHeadquarters) {
          //  location = companyHeadquarters; // Or keep 'Remote' if HQ isn't relevant
        //}


        //const textToEmbed = `${jobTitle} ${descriptionText || ''}`; // Ensure descriptionText is not null/undefined
        //let jobEmbedding = [];
        //if (textToEmbed.trim().length > jobTitle.trim().length + 5) { // Only embed if description adds meaningful content
          //  try {
            //    jobEmbedding = await embeddingClient.getEmbedding(textToEmbed);
            //} catch (embeddingError) {
              //  logger.error(`Failed to get embedding for job "${jobTitle}" @ ${fullJobDetailUrl}. Error: ${embeddingError.message}`);
              //  jobsFailedToEmbed++;
            //}
        //} else {
          //  logger.warn(`Skipping embedding for job "${jobTitle}" @ ${fullJobDetailUrl} due to very short/missing description text.`);
        //}
        

        //const newJob = new Job({
          //title: jobTitle,
          //company: companyName,
          //location: location,
          //description: descriptionHtml, // HTML from detail page
          //parsedDescription: descriptionText, // Plain text from detail page
          //url: fullJobDetailUrl,
          //source: SOURCE_NAME,
          //isRemote: true,
          //tags: categories.filter(c => c.toLowerCase() !== location.toLowerCase()),
          //embedding: jobEmbedding.length > 0 ? jobEmbedding : undefined,
          // postedDate: // TODO: Parse from e.g., "1d ago", "New" which is in <p class="new-listing__header__icons__date">
        //});

        //await newJob.save();
        //jobsAdded++;
        //logger.info(`Added job: "${jobTitle}" by ${companyName} from ${SOURCE_NAME}`);


      } catch (jobError) {
        logger.error(`Error processing one WWR job item: ${jobError.message}`, { stack: jobError.stack, itemHtml: jobItemElement.html() ? jobItemElement.html().substring(0,300) : 'N/A' });
      }
    }

    logger.info(`Scraping for ${SOURCE_NAME} finished. Found on page: ${jobsFoundOnPage}, Added: ${jobsAdded}, Already existed: ${jobsAlreadyExisted}, Failed to Embed: ${jobsFailedToEmbed}.`);
    return { source: SOURCE_NAME, url: fullListingPageUrl, jobsFound: jobsFoundOnPage, jobsAdded, jobsAlreadyExisted, jobsFailedToEmbed };

  } catch (error) {
    logger.error(`Major error during scraping ${SOURCE_NAME} from ${fullListingPageUrl}: ${error.message}`);
    if (error.isAxiosError && error.response) {
        logger.error(`Axios error details: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data).substring(0,200)}`);
    }
    throw new ApiError(500, `Scraping ${SOURCE_NAME} failed: ${error.message}`);
  }
}

module.exports = {
  scrapeWeWorkRemotely,
  SOURCE_NAME,
};