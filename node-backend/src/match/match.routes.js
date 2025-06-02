const express = require('express');
const matchController = require('./match.controller');

const router = express.Router();

// POST /api/v1/match/jobs
router.post('/jobs', matchController.matchJobsController);

module.exports = router;