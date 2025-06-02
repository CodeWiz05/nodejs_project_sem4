const mongoose = require('mongoose');
const logger = require('../../utils/logger'); // For potential logging during schema methods

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required.'],
      trim: true,
      index: true, // Index for faster searching on title
    },
    company: {
      type: String,
      required: [true, 'Company name is required.'],
      trim: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote', // Sensible default if location is often missing or if focusing on remote
    },
    description: { // Raw description from scraper
      type: String,
      required: [true, 'Job description is required.'],
    },
    parsedDescription: { // Cleaned/concatenated text used for embedding
      type: String,
      required: [true, 'Parsed job description for embedding is required.'],
    },
    url: {
      type: String,
      required: [true, 'Job URL is required.'],
      unique: true, // Ensures we don't store duplicate jobs based on URL
      trim: true,
    },
    source: { // e.g., 'NicheJobBoardA', 'LinkedInScraper'
      type: String,
      required: [true, 'Job source is required.'],
      trim: true,
      index: true,
    },
    isRemote: {
      type: Boolean,
      default: false,
      index: true,
    },
    experienceLevel: { // e.g., 'entry', 'mid-level', 'senior', 'lead'
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    tags: {
      type: [String], // Array of keywords/tags extracted or assigned
      index: true,
    },
    embedding: {
      type: [Number], // Array of floats representing the embedding vector
      // Not strictly required here, as it's added after fetching from embedding service
      // We might make this required if we only save jobs that have been successfully embedded.
      // For now, let's make it optional at the schema level.
      // The dimension should match your embedding model (all-MiniLM-L6-v2 has 384 dimensions)
      validate: {
        validator: function(v) {
          // Allow empty array (not yet embedded) or array of 384 numbers
          return v === null || v.length === 0 || v.length === 384;
        },
        message: props => `${props.value} is not a valid embedding! Must be null, empty, or have 384 dimensions.`
      }
    },
    postedDate: { // Date when the job was posted (if available from scrape)
      type: Date,
    },
    scrapedAt: { // Date when the job was scraped by our system
      type: Date,
      default: Date.now,
    },
    // Potentially add other fields like: salaryRange, jobType (full-time, contract), etc.
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps automatically
    toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
    toObject: { virtuals: true },
  }
);

// Optional: Create a text index for more complex text searches directly in MongoDB
// This is different from semantic search with embeddings.
// jobSchema.index({ title: 'text', company: 'text', description: 'text', tags: 'text' });

// Method to ensure embedding dimensions are correct if we want to be stricter
// This could be used before saving if needed, but validation is often enough.
// jobSchema.pre('save', function(next) {
//   if (this.embedding && this.embedding.length > 0 && this.embedding.length !== 384) {
//     const err = new Error('Job embedding vector must have 384 dimensions.');
//     logger.error(err.message, { jobId: this._id, url: this.url });
//     return next(err);
//   }
//   next();
// });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;