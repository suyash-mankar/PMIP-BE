/**
 * Normalize and Deduplicate Node
 * Normalizes job data and removes duplicates
 */
async function normalizeAndDedupNode(state) {
  console.log("[NormalizeDedup] Starting...");

  try {
    const jobs = state.jobsRaw;

    if (jobs.length === 0) {
      console.warn("[NormalizeDedup] No jobs to process");
      return {
        ...state,
        jobsNormalized: [],
      };
    }

    // Normalize jobs to common schema
    const normalized = jobs.map((job) => ({
      title: cleanText(job.title),
      company: cleanText(job.company),
      location: cleanText(job.location),
      description: cleanText(job.description),
      applyUrl: job.applyUrl,
      salary: job.salary || null,
      postedDate: job.postedDate || null,
      source: job.source,
      rawData: job.rawData || {},
    }));

    // Deduplicate based on URL, title+company similarity
    const deduped = deduplicateJobs(normalized);

    console.log(
      `[NormalizeDedup] Normalized ${normalized.length} jobs, deduped to ${deduped.length}`
    );

    return {
      ...state,
      jobsNormalized: deduped,
    };
  } catch (error) {
    console.error("[NormalizeDedup] Error:", error);
    state.metadata.errors.push({
      node: "normalizeDedup",
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clean text helper
 */
function cleanText(text) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Deduplicate jobs
 */
function deduplicateJobs(jobs) {
  const seen = new Map();
  const deduped = [];

  for (const job of jobs) {
    // Create a key based on URL, or title+company
    const urlKey = job.applyUrl ? normalizeUrl(job.applyUrl) : null;
    const titleCompanyKey = `${job.title.toLowerCase()}_${job.company.toLowerCase()}`;

    // Check if we've seen this job
    if (urlKey && seen.has(urlKey)) {
      continue;
    }
    if (!urlKey && seen.has(titleCompanyKey)) {
      // For jobs without URL, check title+company similarity
      continue;
    }

    // Add to results
    deduped.push(job);
    if (urlKey) {
      seen.set(urlKey, true);
    } else {
      seen.set(titleCompanyKey, true);
    }
  }

  return deduped;
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove query params and trailing slash for comparison
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch (e) {
    return url.toLowerCase();
  }
}

module.exports = { normalizeAndDedupNode };

