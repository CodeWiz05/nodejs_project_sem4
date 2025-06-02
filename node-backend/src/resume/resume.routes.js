const express = require('express');
const resumeController = require('./resume.controller');
const { uploadResume, handleUploadErrors } = require('../middlewares/fileUpload');

const router = express.Router();

router.post(
  '/upload',
  (req, res, next) => { // Custom middleware to chain multer and its error handler
    uploadResume(req, res, (err) => {
      if (err) {
        return handleUploadErrors(err, req, res, next); // Pass to specific multer error handler
      }
      next(); // No multer error, proceed to controller
    });
  },
  resumeController.uploadAndParseResume
);

module.exports = router;