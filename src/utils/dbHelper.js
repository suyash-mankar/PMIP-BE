const { prisma } = require('../config/database');

/**
 * Execute a database query with automatic error handling and fallback
 * @param {Function} queryFn - Function that returns a Prisma query
 * @param {*} fallbackValue - Value to return if query fails
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} Result or fallback value
 */
async function safeQuery(queryFn, fallbackValue = null, operationName = 'Database query') {
  try {
    const result = await queryFn(prisma);
    return result;
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error.message);

    // Return fallback value instead of crashing
    return fallbackValue;
  }
}

/**
 * Execute a database query and throw error if it fails (for critical operations)
 * @param {Function} queryFn - Function that returns a Prisma query
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} Result
 */
async function criticalQuery(queryFn, operationName = 'Critical database query') {
  try {
    const result = await queryFn(prisma);
    return result;
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error.message);
    throw error;
  }
}

module.exports = {
  safeQuery,
  criticalQuery,
  prisma,
};
