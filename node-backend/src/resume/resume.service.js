const pdf = require('pdf-parse');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Parses a PDF buffer into plain text.
 * @param {Buffer} pdfBuffer - The buffer containing the PDF file data.
 * @returns {Promise<string>} - A promise that resolves with the extracted plain text.
 * @throws {ApiError} - If parsing fails or the buffer is invalid.
 */
const parsePdfResume = async (pdfBuffer) => {
  if (!pdfBuffer || !(pdfBuffer instanceof Buffer) || pdfBuffer.length === 0) {
    throw new ApiError(400, 'Invalid or empty PDF file buffer provided.');
  }

  try {
    // pdf-parse options can be added here if needed
    // e.g., { max: 10 } to limit to first 10 pages for very long resumes
    const data = await pdf(pdfBuffer);

    // data.text contains the extracted text
    // data.numpages, data.numrender, data.info, data.metadata, data.version are also available
    logger.debug(`PDF parsed successfully. Pages: ${data.numpages}, Chars: ${data.text.length}`);

    if (!data.text || data.text.trim().length === 0) {
        logger.warn('Parsed PDF text is empty.');
        // Decide if this is an error or just an empty resume
        // For now, let's treat it as potentially valid but log a warning.
        // throw new ApiError(400, 'Could not extract text from the PDF. It might be an image-only PDF or corrupted.');
    }
    return data.text;
  } catch (error) {
    logger.error('Error parsing PDF:', error);
    if (error.message && error.message.includes('Invalid PDF_js src')) {
        throw new ApiError(400, 'Invalid PDF file format or corrupted PDF.');
    }
    throw new ApiError(500, `Failed to parse PDF resume: ${error.message}`);
  }
};

module.exports = {
  parsePdfResume,
};