/**
 * Curriculum Planner Agent
 * Generates personalized weekly practice plans based on user performance
 */

const { buildAgent } = require('../core/buildAgent');
const { fastLLM } = require('../core/llm');
const { knowledgeRetriever, userMemory } = require('../tools');
const { prisma } = require('../../config/database');

async function buildCurriculumAgent() {
  const tools = [knowledgeRetriever, userMemory, analyzePerformanceTool];

  const systemPrompt = `You are a curriculum planning agent that creates personalized PM interview practice plans.

YOUR ROLE:
- Analyze user's performance history to identify weak areas
- Design weekly practice schedules targeting gaps
- Recommend readings and drills from the knowledge base
- Balance breadth (all categories) with depth (weak areas)

WORKFLOW:
1. Use user_memory to retrieve past answers and scores
2. Use analyze_performance tool to compute weak dimensions and categories
3. Use knowledge_retriever to find relevant readings and frameworks for weak areas
4. Generate a weekly schedule with specific questions, readings, and focus areas

PLAN STRUCTURE:
- 5-7 questions per week
- 60% focus on weak areas, 40% maintaining strong areas
- Include specific readings/frameworks to study
- Set weekly goals and success metrics
- Provide spaced repetition for concepts

OUTPUT:
JSON with:
- weeklySchedule: Object mapping days to activities
- focusAreas: Array of categories/dimensions to prioritize
- suggestedReadings: Array of KB doc references
- targetScores: Object mapping dimensions to target improvements
- estimatedWeeks: Number of weeks to proficiency
- nextSteps: Array of immediate actions`;

  return buildAgent({
    llm: fastLLM,
    tools,
    systemPrompt,
    agentType: 'curriculum',
    maxIterations: 6,
  });
}

/**
 * Performance Analysis Tool
 * Analyzes user's score history to identify patterns
 */
const analyzePerformanceTool = {
  name: 'analyze_performance',
  description: `Analyze user's answer history and scores to identify weak areas.

Args:
  - userId (number, required): User ID

Returns: JSON with weak categories, dimensions, average scores, and patterns.`,

  schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID to analyze',
      },
    },
    required: ['userId'],
  },

  async func({ userId }) {
    try {
      // Get user's answer history with scores
      const answers = await prisma.answer.findMany({
        where: { userId },
        include: {
          question: { select: { category: true } },
          scores: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // last 50 answers
      });

      if (answers.length === 0) {
        return JSON.stringify({
          message: 'No answer history found',
          weakCategories: [],
          weakDimensions: [],
        });
      }

      // Aggregate scores by category
      const categoryStats = {};
      const dimensionTotals = {
        structure: { sum: 0, count: 0 },
        metrics: { sum: 0, count: 0 },
        prioritization: { sum: 0, count: 0 },
        userEmpathy: { sum: 0, count: 0 },
        communication: { sum: 0, count: 0 },
      };

      for (const ans of answers) {
        if (!ans.scores) continue;

        const cat = ans.question.category;
        if (!categoryStats[cat]) {
          categoryStats[cat] = { sum: 0, count: 0 };
        }
        categoryStats[cat].sum += ans.scores.totalScore || 0;
        categoryStats[cat].count += 1;

        // Aggregate dimensions
        dimensionTotals.structure.sum += ans.scores.structure || 0;
        dimensionTotals.structure.count += 1;
        dimensionTotals.metrics.sum += ans.scores.metrics || 0;
        dimensionTotals.metrics.count += 1;
        dimensionTotals.prioritization.sum += ans.scores.prioritization || 0;
        dimensionTotals.prioritization.count += 1;
        dimensionTotals.userEmpathy.sum += ans.scores.userEmpathy || 0;
        dimensionTotals.userEmpathy.count += 1;
        dimensionTotals.communication.sum += ans.scores.communication || 0;
        dimensionTotals.communication.count += 1;
      }

      // Compute averages
      const categoryAverages = {};
      for (const [cat, stats] of Object.entries(categoryStats)) {
        categoryAverages[cat] = stats.sum / stats.count;
      }

      const dimensionAverages = {};
      for (const [dim, stats] of Object.entries(dimensionTotals)) {
        dimensionAverages[dim] = stats.count > 0 ? stats.sum / stats.count : 0;
      }

      // Identify weak areas (below 6/10)
      const weakCategories = Object.entries(categoryAverages)
        .filter(([_, avg]) => avg < 6)
        .map(([cat, avg]) => ({ category: cat, avgScore: avg }))
        .sort((a, b) => a.avgScore - b.avgScore);

      const weakDimensions = Object.entries(dimensionAverages)
        .filter(([_, avg]) => avg < 6)
        .map(([dim, avg]) => ({ dimension: dim, avgScore: avg }))
        .sort((a, b) => a.avgScore - b.avgScore);

      return JSON.stringify({
        totalAnswers: answers.length,
        categoryAverages,
        dimensionAverages,
        weakCategories,
        weakDimensions,
        overallAverage:
          Object.values(categoryAverages).reduce((sum, v) => sum + v, 0) /
          Object.keys(categoryAverages).length,
      });
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};

module.exports = { buildCurriculumAgent };
