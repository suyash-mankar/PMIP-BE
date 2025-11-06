const { JSearchProvider } = require('../providers/jsearch');

/**
 * Job Search Agent
 * Searches jobs using JSearch API
 * Note: LinkedIn integration is disabled for now - will be re-enabled in future
 */
async function multiSourceJobSearchAgent(state) {
  console.log('[MultiSourceJobSearch] Starting job search with JSearch...');

  try {
    const jobsRaw = [];
    
    // Search JSearch for all queries
    console.log('[MultiSourceJobSearch] Searching JSearch...');
    const jsearchProvider = new JSearchProvider();
    
    for (const queryObj of state.queries) {
      console.log(`[MultiSourceJobSearch:JSearch] Searching: "${queryObj.query}" in ${queryObj.location}`);

      try {
        const results = await jsearchProvider.search({
          keywords: queryObj.query,
          location: queryObj.location,
          datePosted: queryObj.datePosted || 'month',
          remote: queryObj.remote,
        }, 30); // Request up to 30 jobs per query

        console.log(`[MultiSourceJobSearch:JSearch] Found ${results.length} jobs`);
        jobsRaw.push(...results);
      } catch (error) {
        console.error(`[MultiSourceJobSearch:JSearch] Query failed:`, error.message);
        // Continue with other queries
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const jsearchJobs = jobsRaw.filter(j => j.source === 'jsearch');
    console.log(`[MultiSourceJobSearch] JSearch total: ${jsearchJobs.length} jobs`);
    console.log(`[MultiSourceJobSearch] Total jobs collected: ${jobsRaw.length}`);

    // Update metadata
    const updatedMetadata = {
      ...state.metadata,
      jobSources: {
        jsearch: jsearchJobs.length,
        linkedin: 0, // LinkedIn disabled for now
      },
      linkedinEnabled: false, // LinkedIn disabled for now
    };

    return {
      ...state,
      jobsRaw,
      metadata: updatedMetadata,
    };
  } catch (error) {
    console.error('[MultiSourceJobSearch] Error:', error);
    state.metadata.errors.push({
      node: 'multiSourceJobSearch',
      error: error.message,
    });
    throw error;
  }
}

module.exports = { multiSourceJobSearchAgent };
