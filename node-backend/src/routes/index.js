const express = require('express');
const resumeRoutes = require('../resume/resume.routes');
const jobRoutes = require('../jobs/job.routes'); // For later
//const matchRoutes = require('../match/match.routes'); // For later
//const alertRoutes = require('../alerts/alert.routes'); // For later

const router = express.Router();

const defaultRoutes = [
  {
    path: '/resume',
    route: resumeRoutes,
  },
  {
    path: '/jobs',
    route: jobRoutes,
  },
  //{
  //  path: '/match',
  //  route: matchRoutes,
  //},
  //{
  //  path: '/alerts',
  //  route: alertRoutes
  //}
];

// You can add more routes here, e.g., for health checks specific to v1, auth routes, etc.
// router.get('/health', (req, res) => res.send('API v1 Healthy'));

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;