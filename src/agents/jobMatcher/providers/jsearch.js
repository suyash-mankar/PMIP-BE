const { JobProvider } = require('./types');
const { searchJobs } = require('../../../services/jobs/aggregators/jsearch');

/**
 * JSearch Job Provider
 * Wraps the existing JSearch aggregator service
 */
class JSearchProvider extends JobProvider {
  constructor() {
    super();
    this.name = 'jsearch';
  }

  /**
   * Search for jobs using JSearch API
   * @param {Object} query - JobSearchQuery
   * @param {number} limit - Max results
   * @returns {Promise<JobItem[]>}
   */
  async search(query, limit = 10) {
    console.log(`[JSearchProvider] Searching: "${query.keywords}" in ${query.location || 'India'}`);

    try {
      const results = await searchJobs({
        query: query.keywords,
        location: query.location || 'India',
        page: 1,
        numPages: 1,
        datePosted: query.datePosted || 'month',
      });

      // Normalize to JobItem format
      const normalized = results.map(job => ({
        source: 'jsearch',
        sourceId: job.rawData?.job_id || undefined,
        title: job.title,
        company: job.company,
        location: job.location,
        postedAt: job.postedDate,
        employmentType: job.rawData?.job_employment_type || undefined,
        seniority: job.rawData?.job_required_experience?.required_experience_in_months 
          ? this._inferSeniority(job.rawData.job_required_experience.required_experience_in_months)
          : undefined,
        descriptionSnippet: job.description ? job.description.substring(0, 300) + '...' : undefined,
        skills: job.rawData?.job_required_skills || [],
        applyUrl: job.applyUrl,
        salary: job.salary,
        logo: job.rawData?.employer_logo || undefined,
      }));

      const limited = normalized.slice(0, limit);
      console.log(`[JSearchProvider] Found ${results.length} jobs, returning ${limited.length}`);
      
      return limited;
    } catch (error) {
      console.error(`[JSearchProvider] Error:`, error.message);
      throw new Error(`JSearch provider failed: ${error.message}`);
    }
  }

  /**
   * Test JSearch availability
   */
  async test() {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return { 
        available: false, 
        message: 'RAPIDAPI_KEY not configured' 
      };
    }

    try {
      // Try a minimal search
      const results = await searchJobs({
        query: 'software engineer',
        location: 'India',
        page: 1,
        numPages: 1,
      });
      
      return { 
        available: true, 
        message: `JSearch is working, test returned ${results.length} results` 
      };
    } catch (error) {
      return { 
        available: false, 
        message: `JSearch test failed: ${error.message}` 
      };
    }
  }

  /**
   * Get status
   */
  async getStatus() {
    const hasKey = !!process.env.RAPIDAPI_KEY;
    return { 
      healthy: hasKey, 
      message: hasKey ? 'JSearch configured' : 'Missing RAPIDAPI_KEY' 
    };
  }

  /**
   * Infer seniority from experience months
   * @private
   */
  _inferSeniority(months) {
    if (!months) return undefined;
    if (months < 24) return 'Entry-level';
    if (months < 60) return 'Mid-level';
    return 'Senior';
  }
}

module.exports = { JSearchProvider };

