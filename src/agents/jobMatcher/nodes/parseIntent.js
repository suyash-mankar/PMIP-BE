const { ChatOpenAI } = require("@langchain/openai");

/**
 * Intent Parser Agent
 * Extracts structured job search constraints from natural language
 */
async function intentParserAgent(state) {
  console.log("[ParseIntent] Starting...");

  try {
    if (!state.jobIntentText) {
      throw new Error("Job intent text not available");
    }

    const llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context from parsed profile
    const profileContext = `
Resume Profile:
- Skills: ${state.parsedProfile.skills.slice(0, 10).join(", ")}
- Previous Titles: ${state.parsedProfile.titles.join(", ")}
- Seniority: ${state.parsedProfile.seniority || "unknown"}
- Industries: ${state.parsedProfile.industries.join(", ")}
- Years of Experience: ${state.parsedProfile.yearsOfExperience || "unknown"}
    `.trim();

    const prompt = `You are an expert job search query parser. Extract structured job search constraints from the user's natural language intent.

${profileContext}

User's Job Intent:
"${state.jobIntentText}"

Additional Constraints:
- Desired Role: ${state.desiredRole || "not specified"}
- Company Preferences: ${state.companyPrefs || "not specified"}
- Location Preference: ${state.locationPref || "not specified"}
- Remote Preference: ${state.remotePref || "not specified"}

Extract the following information in JSON format:
{
  "roles": ["list of target job roles/titles"],
  "industries": ["specific industries or sectors mentioned"],
  "locations": ["cities or regions in India, default to major cities if not specified"],
  "companyAttributes": ["company characteristics like 'AI-first', 'startup', 'MNC', 'B2B', etc."],
  "seniority": "entry|mid|senior|lead|executive|null",
  "remote": "remote|hybrid|onsite|null",
  "salaryRange": {"min": <number in LPA>, "max": <number in LPA>} or null,
  "recencyWindow": "today|week|month|all"
}

Important:
- For locations, always include "India" as the country filter
- If no specific city mentioned, use major tech hubs: Bangalore, Mumbai, Delhi, Pune, Hyderabad
- Infer seniority from resume if not explicit in intent
- Default recency to "month" for active job searches

Return ONLY the JSON object, no additional text.`;

    const response = await llm.invoke(prompt);
    const content = response.content;

    // Parse JSON from response
    let extractedIntent;
    try {
      const jsonMatch = content.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedIntent = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("[ParseIntent] JSON parse error:", parseError);
      throw new Error("Failed to parse intent LLM response as JSON");
    }

    console.log("[ParseIntent] Extracted intent:", {
      roles: extractedIntent.roles?.length || 0,
      locations: extractedIntent.locations?.length || 0,
      remote: extractedIntent.remote,
    });

    return {
      ...state,
      extractedIntent: {
        roles: extractedIntent.roles || [],
        industries: extractedIntent.industries || [],
        locations: extractedIntent.locations || ["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad"],
        companyAttributes: extractedIntent.companyAttributes || [],
        seniority: extractedIntent.seniority || state.parsedProfile.seniority,
        remote: extractedIntent.remote || null,
        salaryRange: extractedIntent.salaryRange || null,
        recencyWindow: extractedIntent.recencyWindow || "month",
      },
    };
  } catch (error) {
    console.error("[ParseIntent] Error:", error);
    state.metadata.errors.push({
      node: "parseIntent",
      error: error.message,
    });
    throw error;
  }
}

module.exports = { intentParserAgent };

