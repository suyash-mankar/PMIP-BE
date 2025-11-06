/**
 * Query Builder Node
 * Builds search queries combining resume profile and extracted intent
 */
async function queryBuilderNode(state) {
  console.log("[QueryBuilder] Starting...");

  try {
    const queries = [];
    const intent = state.extractedIntent;
    const profile = state.parsedProfile;

    // Primary roles from intent or profile
    const roles = intent.roles.length > 0 ? intent.roles : profile.titles.slice(0, 3);

    if (roles.length === 0) {
      throw new Error("No roles identified from resume or intent");
    }

    // Build queries for each role + location combination
    for (const role of roles) {
      // For each location
      for (const location of intent.locations.slice(0, 3)) {
        // 3 locations max
        let query = role;

        // Add company attributes if specified
        if (intent.companyAttributes.length > 0) {
          query += ` ${intent.companyAttributes.slice(0, 2).join(" ")}`;
        }

        // Add seniority if specified
        if (intent.seniority && intent.seniority !== "null") {
          query += ` ${intent.seniority}`;
        }

        queries.push({
          query,
          location,
          remote: intent.remote,
          datePosted: intent.recencyWindow,
        });
      }
    }

    // If too few queries, add fallback with just role + India
    if (queries.length < 3 && roles.length > 0) {
      queries.push({
        query: roles[0],
        location: "India",
        remote: intent.remote,
        datePosted: intent.recencyWindow,
      });
    }

    console.log(`[QueryBuilder] Generated ${queries.length} queries`);

    return {
      ...state,
      queries,
    };
  } catch (error) {
    console.error("[QueryBuilder] Error:", error);
    state.metadata.errors.push({
      node: "queryBuilder",
      error: error.message,
    });
    throw error;
  }
}

module.exports = { queryBuilderNode };

