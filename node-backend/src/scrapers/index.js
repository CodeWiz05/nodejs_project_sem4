// Import your specific scraper/client modules
const remoteOkClient = require('./remoteOkClient'); // Updated name

// An array of all scraper/client functions you want to be able to run.
const allScrapers = [
  remoteOkClient.fetchRemoteOkAPI, // Updated function name
];

// A map by SOURCE_NAME.
const scrapersBySource = {
  [remoteOkClient.SOURCE_NAME]: remoteOkClient.fetchRemoteOkAPI, // Updated
};

module.exports = {
  allScrapers,
  scrapersBySource,
};