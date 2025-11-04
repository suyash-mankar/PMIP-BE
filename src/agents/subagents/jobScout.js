/**
 * Job Scout Agent
 * Searches, ranks, and recommends PM jobs based on user profile
 */

const { buildAgent } = require('../core/buildAgent');
const { fastLLM } = require('../core/llm');
const { jobRank } = require('../../utils/vector');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

// Placeholder job search tool (integrate with real APIs)
const jobSearchTool = new DynamicStructuredTool({
  name: 'search_jobs',
  description:
    'Search job postings from various sources. Returns job listings with title, company, location, description.',
  schema: z.object({
    query: z.string().describe('Search query (e.g., "Product Manager")'),
    location: z.string().optional().describe('Location filter'),
    limit: z.number().optional().default(20).describe('Max results'),
  }),
  func: async ({ query, location, limit = 20 }) => {
    // TODO: Integrate with real job APIs (LinkedIn, Indeed, Google Jobs)
    // For now, return mock structure
    console.log(`Searching jobs: ${query} ${location || ''}`);

    // Mock response structure
    return JSON.stringify({
      message: 'Job search integration pending. Connect to LinkedIn/Indeed/Google Jobs API.',
      query,
      location,
      results: [],
    });
  },
});

const JOB_SCOUT_SYSTEM_PROMPT = `You are a career advisor specializing in PM roles.

Your role is to:
1. Search for relevant PM job postings
2. Rank them by fit to user's profile
3. Extract key requirements and match score
4. Provide application tips specific to each role
5. Suggest relevant practice questions for interview prep

TOOLS AVAILABLE:
- search_jobs: Find job postings from various sources

OUTPUT STRUCTURE:
- Top 5 recommended jobs with links
- Match score and reasoning for each
- Key skills to highlight
- Recommended practice questions
- Application tips

Be specific and actionable.`;

let jobScoutAgentInstance = null;

async function buildJobScoutAgent() {
  if (jobScoutAgentInstance) {
    return jobScoutAgentInstance;
  }

  const tools = [jobSearchTool];

  jobScoutAgentInstance = await buildAgent({
    llm: fastLLM,
    tools,
    systemPrompt: JOB_SCOUT_SYSTEM_PROMPT,
    maxIterations: 3,
  });

  return jobScoutAgentInstance;
}

/**
 * Find and rank jobs for user
 * @param {Object} params - Job search parameters
 * @returns {Promise<Object>} Ranked jobs
 */
async function findJobs({ userId, query = 'Product Manager', location, limit = 10 }) {
  try {
    // Get ranked jobs from vector DB (if resume exists)
    const rankedJobs = await jobRank({ userId, k: limit });

    if (rankedJobs.length > 0) {
      return {
        source: 'vector_db',
        jobs: rankedJobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          matchScore: job.similarity,
          metadata: job.metadata,
        })),
      };
    }

    // Fallback: use agent to search
    const agent = await buildJobScoutAgent();
    const result = await agent.invoke({
      input: `Search for ${query} jobs${location ? ` in ${location}` : ''} and return top ${limit} matches.`,
    });

    return {
      source: 'agent_search',
      result: result.output,
    };
  } catch (error) {
    console.error('Job scout error:', error);
    throw error;
  }
}

module.exports = {
  buildJobScoutAgent,
  findJobs,
};

