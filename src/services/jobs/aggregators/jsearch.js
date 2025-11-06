const axios = require("axios");

/**
 * Search jobs using JSearch API (RapidAPI)
 * Filters results to India by default
 */
async function searchJobs({ query, location = "India", page = 1, numPages = 1, datePosted = "month" }) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.warn("RAPIDAPI_KEY not configured, skipping JSearch");
      return [];
    }

    const options = {
      method: "GET",
      url: "https://jsearch.p.rapidapi.com/search",
      params: {
        query: `${query} in ${location}`,
        page: page.toString(),
        num_pages: numPages.toString(),
        date_posted: datePosted, // all, today, 3days, week, month
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    };

    const response = await axios.request(options);
    const jobs = response.data.data || [];

    // Normalize to common format
    return jobs.map((job) => ({
      title: job.job_title || "",
      company: job.employer_name || "",
      location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country || "",
      description: job.job_description || "",
      applyUrl: job.job_apply_link || job.job_google_link || "",
      salary: job.job_salary_period && job.job_min_salary
        ? `${job.job_salary_currency} ${job.job_min_salary}-${job.job_max_salary} ${job.job_salary_period}`
        : null,
      postedDate: job.job_posted_at_datetime_utc || null,
      source: "jsearch",
      rawData: job,
    }));
  } catch (error) {
    console.error("JSearch API error:", error.message);
    return [];
  }
}

module.exports = { searchJobs };

