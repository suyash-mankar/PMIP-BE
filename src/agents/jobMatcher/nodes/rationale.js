const { ChatOpenAI } = require("@langchain/openai");

/**
 * Rationale Agent
 * Generates "why this fits you" rationale for top jobs
 */
async function rationaleAgent(state) {
  console.log("[Rationale] Starting...");

  try {
    const topJobs = state.jobsRanked.slice(0, 10); // Top 10 jobs

    if (topJobs.length === 0) {
      console.warn("[Rationale] No jobs to generate rationale for");
      return {
        ...state,
        topJobs: [],
      };
    }

    const llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build profile context
    const profileContext = `
Profile:
- Skills: ${state.parsedProfile.skills.slice(0, 15).join(", ")}
- Titles: ${state.parsedProfile.titles.join(", ")}
- Seniority: ${state.parsedProfile.seniority || "unknown"}
- Industries: ${state.parsedProfile.industries.join(", ")}
- Years: ${state.parsedProfile.yearsOfExperience || "unknown"}
- Education: ${state.parsedProfile.education.join(", ")}

Intent: ${state.jobIntentText}
    `.trim();

    // Generate rationale for each job
    const jobsWithRationale = await Promise.all(
      topJobs.map(async (job) => {
        try {
          const prompt = `You are a career advisor. Explain in 2-3 concise bullet points (each 10-15 words max) why this job is a great fit for the candidate.

${profileContext}

Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description ? job.description.slice(0, 500) : "N/A"}

Focus on:
- Skill matches
- Experience alignment
- Career progression fit
- Industry relevance

Return ONLY the bullet points, no introduction. Start each point with "•".`;

          const response = await llm.invoke(prompt);
          let rationale = response.content.trim();

          // Clean up formatting
          rationale = rationale
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => line.trim().replace(/^[•\-*]\s*/, ""))
            .join("\n• ");

          if (!rationale.startsWith("•")) {
            rationale = "• " + rationale;
          }

          return {
            ...job,
            rationale,
          };
        } catch (error) {
          console.error(`[Rationale] Error for job ${job.title}:`, error.message);
          return {
            ...job,
            rationale: "Strong match based on your profile and search criteria.",
          };
        }
      })
    );

    console.log(`[Rationale] Generated rationale for ${jobsWithRationale.length} jobs`);

    return {
      ...state,
      topJobs: jobsWithRationale,
    };
  } catch (error) {
    console.error("[Rationale] Error:", error);
    state.metadata.errors.push({
      node: "rationale",
      error: error.message,
    });
    // Return jobs without rationale as fallback
    return {
      ...state,
      topJobs: state.jobsRanked.slice(0, 10).map((job) => ({
        ...job,
        rationale: "Match based on your profile and preferences.",
      })),
    };
  }
}

module.exports = { rationaleAgent };

