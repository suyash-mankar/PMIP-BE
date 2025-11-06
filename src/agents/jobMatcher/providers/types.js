/**
 * Job Provider Types and Interfaces
 * Common data structures for all job search providers
 */

/**
 * @typedef {Object} JobItem
 * Normalized job posting from any source
 * @property {string} source - Provider source: 'jsearch' | 'linkedin_cookie'
 * @property {string} [sourceId] - Unique identifier from the source
 * @property {string} title - Job title
 * @property {string} company - Company name
 * @property {string} [location] - Job location (city, country, remote)
 * @property {string} [postedAt] - When the job was posted (ISO date or relative)
 * @property {string} [employmentType] - Full-time, Part-time, Contract, etc.
 * @property {string} [seniority] - Entry-level, Mid-level, Senior, etc.
 * @property {string} [descriptionSnippet] - Brief description or summary
 * @property {string[]} [skills] - Required/mentioned skills
 * @property {string} applyUrl - URL to apply for the job
 * @property {string} [salary] - Salary information if available
 * @property {string} [logo] - Company logo URL if available
 */

/**
 * @typedef {Object} JobSearchQuery
 * Search parameters for job providers
 * @property {string} keywords - Combined from resume + user intent (role + skills)
 * @property {string} [location] - "India", "Bengaluru, India", etc.
 * @property {boolean} [remote] - Remote work preference
 * @property {string[]} [seniority] - Seniority levels to filter
 * @property {string[]} [industries] - Industry preferences
 * @property {string} [datePosted] - 'today', 'week', 'month', 'all'
 */

/**
 * JobProvider Interface
 * All job providers must implement this interface
 * 
 * @interface
 */
class JobProvider {
  /**
   * @type {string} Provider name for logging and identification
   */
  name = 'base-provider';

  /**
   * Search for jobs based on query
   * @param {JobSearchQuery} query - Search parameters
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<JobItem[]>} Array of normalized job items
   * @throws {Error} If the search fails
   */
  async search(query, limit = 10) {
    throw new Error('search() must be implemented by provider');
  }

  /**
   * Test if the provider is available and working
   * @returns {Promise<{available: boolean, message?: string}>}
   */
  async test() {
    return { available: true };
  }

  /**
   * Get provider status/health
   * @returns {Promise<{healthy: boolean, message?: string}>}
   */
  async getStatus() {
    return { healthy: true };
  }
}

module.exports = {
  JobProvider,
};

