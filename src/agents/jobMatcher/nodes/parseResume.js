const { ChatOpenAI } = require("@langchain/openai");

/**
 * Parse Resume Agent
 * Uses LLM to extract structured information from resume text
 */
async function parseResumeAgent(state) {
  console.log("[ParseResume] Starting...");

  try {
    if (!state.resumeText) {
      throw new Error("Resume text not available");
    }

    const llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are an expert resume parser. Extract structured information from the following resume text.

Resume:
${state.resumeText}

Extract the following information in JSON format:
{
  "skills": ["list of technical and soft skills"],
  "titles": ["list of job titles held"],
  "yearsOfExperience": <total years as number, null if unknown>,
  "industries": ["list of industries worked in"],
  "seniority": "entry|mid|senior|lead|executive",
  "education": ["list of degrees and institutions"],
  "achievements": ["key achievements and quantifiable results"]
}

Return ONLY the JSON object, no additional text.`;

    const response = await llm.invoke(prompt);
    const content = response.content;

    // Parse JSON from response
    let parsedProfile;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedProfile = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("[ParseResume] JSON parse error:", parseError);
      throw new Error("Failed to parse LLM response as JSON");
    }

    console.log("[ParseResume] Parsed profile:", {
      skills: parsedProfile.skills?.length || 0,
      titles: parsedProfile.titles?.length || 0,
      seniority: parsedProfile.seniority,
    });

    return {
      ...state,
      parsedProfile: {
        skills: parsedProfile.skills || [],
        titles: parsedProfile.titles || [],
        yearsOfExperience: parsedProfile.yearsOfExperience || null,
        industries: parsedProfile.industries || [],
        seniority: parsedProfile.seniority || null,
        education: parsedProfile.education || [],
        achievements: parsedProfile.achievements || [],
      },
    };
  } catch (error) {
    console.error("[ParseResume] Error:", error);
    state.metadata.errors.push({
      node: "parseResume",
      error: error.message,
    });
    throw error;
  }
}

module.exports = { parseResumeAgent };

