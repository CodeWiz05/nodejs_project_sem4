const express = require('express');
const jobController = require('./job.controller');
// const { authenticate, authorize } = require('../middlewares/auth'); // Placeholder for future auth

const router = express.Router();

// POST /api/v1/jobs/scrape (?source=SourceName) - Trigger scraping
// Making it a POST as it's an action that can have side effects (creating data)
// Could be protected by auth/admin middleware in a real app
router.post(
    '/scrape',
    // authenticate, // Example: ensure user is logged in
    // authorize(['admin']), // Example: ensure user is an admin
    jobController.scrapeJobsController
);

// GET /api/v1/jobs - Get list of jobs with optional filters
// Example: /api/v1/jobs?isRemote=true&experienceLevel=mid-level&searchTerm=developer&page=1&limit=20
router.get(
    '/',
    jobController.getJobsController
);

// Future: GET /api/v1/jobs/:jobId - Get a single job by ID (not implemented yet)
// router.get('/:jobId', jobController.getJobByIdController);

module.exports = router;