/**
 * Calculates the dot product of two vectors.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function dotProduct(vecA, vecB) {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

/**
 * Calculates the magnitude (length) of a vector.
 * @param {number[]} vec
 * @returns {number}
 */
function magnitude(vec) {
  let sumOfSquares = 0;
  for (let i = 0; i < vec.length; i++) {
    sumOfSquares += vec[i] * vec[i];
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Returns 0 if an error occurs (e.g., different dimensions, zero magnitude).
 * @param {number[]} vecA - The first vector.
 * @param {number[]} vecB - The second vector.
 * @returns {number} - The cosine similarity (between -1 and 1).
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    // logger.warn('Cosine similarity: One or both vectors are empty.');
    return 0;
  }
  if (vecA.length !== vecB.length) {
    console.error("Cosine similarity: Cannot calculate for vectors of different dimensions.");
    return 0; 
  }

  const product = dotProduct(vecA, vecB);
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    // console.warn("Cosine similarity: One or both vectors have zero magnitude.");
    return 0;
  }

  return product / (magA * magB);
}

module.exports = { cosineSimilarity };