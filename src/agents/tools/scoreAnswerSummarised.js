/**
 * Score Answer Summarised Tool
 * Wraps the summarised scoring service for agent use - uses EXACT same logic as direct scoring
 */

const { callOpenAIForSummarisedScoring } = require('../../services/openaiService');
const { getCategoryScoringPrompt } = require('../../services/categoryScoringService');
const {
  RCA_SCORING_PROMPT_TEMPLATE,
} = require('../../services/openaiService');

const scoreAnswerSummarised = {
  name: 'score_answer_summarised',
  description: `Score a PM interview answer with concise, summarised feedback using the same high-quality logic as direct scoring.

Args:
  - question (string, required): The question text
  - answer (string, required): The candidate's answer
  - category (string, optional): Question category
  - questionId (number, optional): Question ID for exemplar context
  - conversationHistory (array, optional): Conversation history for RCA questions

Returns: JSON with scores and concise feedback matching the direct summarised scoring quality.`,

  schema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The interview question',
      },
      answer: {
        type: 'string',
        description: 'The candidate answer to score',
      },
      category: {
        type: 'string',
        description: 'Question category (e.g., Product Design, RCA, Metrics)',
      },
      questionId: {
        type: 'number',
        description: 'Question ID for retrieving exemplars',
      },
      conversationHistory: {
        type: 'array',
        description: 'Conversation history array (for RCA questions)',
        items: {
          type: 'object',
        },
      },
    },
    required: ['question', 'answer'],
  },

  async func({ question, answer, category = null, questionId = null, conversationHistory = [] }) {
    try {
      // Use EXACT same prompt logic as scoreSessionSummarised() in scoreService.js
      // This ensures agent scoring has same quality as direct scoring

      const categoryLower = (category || '').toLowerCase();
      const isRCAQuestion =
        categoryLower === 'rca' ||
        categoryLower.includes('root cause') ||
        categoryLower.includes('rca');

      let scoringPrompt;

      // Use RCA-specific prompt for RCA questions with conversation history (same as direct scoring)
      if (isRCAQuestion && conversationHistory && conversationHistory.length > 0) {
        scoringPrompt = RCA_SCORING_PROMPT_TEMPLATE(question, answer, conversationHistory);
      } else {
        // Get category-specific scoring prompt for other questions (same as direct scoring)
        scoringPrompt = getCategoryScoringPrompt(question, answer, category);
      }

      // Validate answer text (same as direct scoring)
      if (!answer || !answer.trim()) {
        throw new Error('Cannot score an empty answer. Please provide an answer text.');
      }

      // Call summarised scoring service (same as direct scoring)
      const { content, tokensUsed } = await callOpenAIForSummarisedScoring(
        question,
        answer,
        scoringPrompt
      );

      return JSON.stringify({
        success: true,
        scores: JSON.parse(content),
        tokensUsed,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  },
};

module.exports = { scoreAnswerSummarised };

