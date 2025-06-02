const multer = require('multer');
const { ApiError } = require('./errorHandler');
const path = require('path');

// Configure storage - for this project, we'll process in memory or save temporarily
// For simplicity, let's use memoryStorage first.
// For larger files or production, diskStorage or cloud storage (e.g., S3) is better.
const memoryStorage = multer.memoryStorage();

// File filter to accept only PDFs
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true); // Accept file
  } else {
    cb(new ApiError(400, 'Invalid file type. Only PDF files are allowed.'), false); // Reject file
  }
};

const uploadResume = multer({
  storage: memoryStorage, // Stores file in memory (req.file.buffer)
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit for resume PDFs
  },
}).single('resumeFile'); // 'resumeFile' is the field name in the form-data

// Middleware to handle multer errors specifically
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'File too large. Maximum size is 5MB.'));
    }
    // Handle other multer errors if needed
    return next(new ApiError(400, `File upload error: ${err.message}`));
  } else if (err) {
    // An unknown error occurred when uploading.
    return next(err); // Pass it to the global error handler
  }
  // Everything went fine with multer, proceed
  next();
};


module.exports = {
    uploadResume,
    handleUploadErrors
};