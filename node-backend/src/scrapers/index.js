// Import your specific scraper modules
const wwrScraper = require('./weworkremotelyScraper');
// If you add more scrapers in the future, import them here:
// const anotherScraper = require('./anotherSiteScraper');

// An array of all scraper functions you want to be able to run.
// The job.service.js will iterate over this array to run all scrapers,
// or pick one if a specific source is requested.
const allScrapers = [
  wwrScraper.scrapeWeWorkRemotely, // This is the main function exported by weworkremotelyScraper.js
  // anotherScraper.scrapeSomeOtherBoard, // Example if you add another
];

// A map of scraper functions keyed by their SOURCE_NAME.
// This allows job.service.js to easily select a specific scraper by its name.
// Make sure the SOURCE_NAME exported from your scraper module matches the key here.
const scrapersBySource = {
  [wwrScraper.SOURCE_NAME]: wwrScraper.scrapeWeWorkRemotely,
  // [anotherScraper.SOURCE_NAME]: anotherScraper.scrapeSomeOtherBoard,
};

module.exports = {
  allScrapers,
  scrapersBySource,
};