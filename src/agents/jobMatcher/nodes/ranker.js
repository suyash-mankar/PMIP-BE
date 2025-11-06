const { embedText } = require("../../../utils/vector");

/**
 * Ranker Agent
 * Ranks jobs based on match score using embeddings and heuristics
 */
async function rankerAgent(state) {
  console.log("[Ranker] Starting...");

  try {
    const jobs = state.jobsNormalized;

    if (jobs.length === 0) {
      console.warn("[Ranker] No jobs to rank");
      return {
        ...state,
        jobsRanked: [],
      };
    }

    // Build profile text for embedding
    const profileText = buildProfileText(state);
    const profileEmbedding = await embedText(profileText, "text-embedding-3-small");

    // Score each job
    const scoredJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobText = buildJobText(job);
        const jobEmbedding = await embedText(jobText, "text-embedding-3-small");

        // Calculate semantic similarity
        const semanticScore = cosineSimilarity(profileEmbedding, jobEmbedding);

        // Calculate heuristic scores
        const skillScore = calculateSkillOverlap(state.parsedProfile.skills, job.description);
        const recencyScore = calculateRecencyScore(job.postedDate);
        const seniorityScore = calculateSeniorityMatch(state.parsedProfile.seniority, job.title);
        const locationScore = calculateLocationMatch(state.extractedIntent.locations, job.location);

        // Weighted total score
        const weights = {
          semantic: parseFloat(process.env.SCORE_WEIGHT_SEMANTIC || "0.5"),
          skill: parseFloat(process.env.SCORE_WEIGHT_SKILL || "0.2"),
          recency: parseFloat(process.env.SCORE_WEIGHT_RECENCY || "0.15"),
          seniority: parseFloat(process.env.SCORE_WEIGHT_SENIORITY || "0.1"),
          location: parseFloat(process.env.SCORE_WEIGHT_LOCATION || "0.05"),
        };

        const totalScore =
          semanticScore * weights.semantic +
          skillScore * weights.skill +
          recencyScore * weights.recency +
          seniorityScore * weights.seniority +
          locationScore * weights.location;

        return {
          ...job,
          score: Math.min(totalScore, 1.0), // Cap at 1.0
          scoreBreakdown: {
            semantic: semanticScore,
            skill: skillScore,
            recency: recencyScore,
            seniority: seniorityScore,
            location: locationScore,
          },
        };
      })
    );

    // Sort by score descending
    const ranked = scoredJobs.sort((a, b) => b.score - a.score);

    console.log(`[Ranker] Ranked ${ranked.length} jobs, top score: ${ranked[0]?.score.toFixed(3)}`);

    return {
      ...state,
      jobsRanked: ranked,
    };
  } catch (error) {
    console.error("[Ranker] Error:", error);
    state.metadata.errors.push({
      node: "ranker",
      error: error.message,
    });
    throw error;
  }
}

/**
 * Build profile text for embedding
 */
function buildProfileText(state) {
  const parts = [
    `Job Intent: ${state.jobIntentText}`,
    `Skills: ${state.parsedProfile.skills.join(", ")}`,
    `Titles: ${state.parsedProfile.titles.join(", ")}`,
    `Industries: ${state.parsedProfile.industries.join(", ")}`,
  ];
  return parts.filter((p) => p).join("\n");
}

/**
 * Build job text for embedding
 */
function buildJobText(job) {
  return `${job.title} at ${job.company}. ${job.description || ""}`.slice(0, 1000);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

/**
 * Calculate skill overlap score
 */
function calculateSkillOverlap(skills, description) {
  if (!description || skills.length === 0) return 0;

  const descLower = description.toLowerCase();
  const matchedSkills = skills.filter((skill) =>
    descLower.includes(skill.toLowerCase())
  );

  return Math.min(matchedSkills.length / skills.length, 1.0);
}

/**
 * Calculate recency score
 */
function calculateRecencyScore(postedDate) {
  if (!postedDate) return 0.5; // Default score if date unknown

  const posted = new Date(postedDate);
  const now = new Date();
  const daysAgo = (now - posted) / (1000 * 60 * 60 * 24);

  if (daysAgo <= 7) return 1.0;
  if (daysAgo <= 14) return 0.9;
  if (daysAgo <= 30) return 0.7;
  if (daysAgo <= 60) return 0.5;
  return 0.3;
}

/**
 * Calculate seniority match score
 */
function calculateSeniorityMatch(profileSeniority, jobTitle) {
  if (!profileSeniority) return 0.5;

  const titleLower = jobTitle.toLowerCase();
  const seniorityKeywords = {
    entry: ["junior", "entry", "associate", "intern"],
    mid: ["mid", "engineer", "analyst", "specialist"],
    senior: ["senior", "lead", "principal"],
    lead: ["lead", "staff", "principal", "architect"],
    executive: ["director", "head", "vp", "chief", "cto", "ceo"],
  };

  const keywords = seniorityKeywords[profileSeniority] || [];
  const matches = keywords.some((keyword) => titleLower.includes(keyword));

  return matches ? 1.0 : 0.5;
}

/**
 * Calculate location match score
 */
function calculateLocationMatch(preferredLocations, jobLocation) {
  if (!jobLocation || preferredLocations.length === 0) return 0.5;

  const jobLower = jobLocation.toLowerCase();
  const matches = preferredLocations.some((loc) => jobLower.includes(loc.toLowerCase()));

  return matches ? 1.0 : 0.3;
}

module.exports = { rankerAgent };

