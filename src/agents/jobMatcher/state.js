/**
 * Job Matcher Graph State
 * This defines the state that flows through the LangGraph
 */

const initialState = {
  // Input
  runId: null,
  resumeFilePath: null,
  userEmail: null,
  jobIntentText: null,
  desiredRole: null,
  companyPrefs: null,
  locationPref: null,
  remotePref: null,

  // Resume Processing
  resumeText: null,
  parsedProfile: {
    skills: [],
    titles: [],
    yearsOfExperience: null,
    industries: [],
    seniority: null,
    education: [],
    achievements: [],
  },

  // Intent Processing
  extractedIntent: {
    roles: [],
    industries: [],
    locations: [],
    companyAttributes: [],
    seniority: null,
    remote: null,
    salaryRange: null,
    recencyWindow: "month",
  },

  // Search
  queries: [],
  jobsRaw: [],
  
  // Processing
  jobsNormalized: [],
  jobsRanked: [],
  
  // Output
  topJobs: [],
  emailHtml: null,
  emailSent: false,

  // Metadata
  metadata: {
    startTime: null,
    endTime: null,
    errors: [],
    linkedinAttempted: false,
    linkedinSuccessful: false,
  },
};

module.exports = { initialState };

