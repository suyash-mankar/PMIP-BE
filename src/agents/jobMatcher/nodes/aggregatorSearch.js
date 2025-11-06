const { searchJobs } = require("../../../services/jobs/aggregators/jsearch");

/**
 * Aggregator Search Agent
 * Searches jobs using aggregator APIs (JSearch/SerpAPI)
 */
async function aggregatorSearchAgent(state) {
  console.log("[AggregatorSearch] Starting...");

  try {
    const jobsRaw = [];

    // Execute all queries
    for (const queryObj of state.queries) {
      console.log(`[AggregatorSearch] Searching: "${queryObj.query}" in ${queryObj.location}`);

      try {
        const results = await searchJobs({
          query: queryObj.query,
          location: queryObj.location,
          page: 1,
          numPages: 1,
          datePosted: queryObj.datePosted || "month",
        });

        console.log(`[AggregatorSearch] Found ${results.length} jobs`);
        jobsRaw.push(...results);
      } catch (error) {
        console.error(`[AggregatorSearch] Query failed:`, error.message);
        // Continue with other queries
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`[AggregatorSearch] Total jobs collected: ${jobsRaw.length}`);

    return {
      ...state,
      jobsRaw,
    };
  } catch (error) {
    console.error("[AggregatorSearch] Error:", error);
    state.metadata.errors.push({
      node: "aggregatorSearch",
      error: error.message,
    });
    throw error;
  }
}

module.exports = { aggregatorSearchAgent };

