/**
 * Score Answer Tool
 * Wraps the existing scoring service for agent use - uses EXACT same logic as direct scoring
 */

const { callOpenAIForScoring } = require('../../services/openaiService');
const { fetchRagContext, wrapPromptWithContext } = require('../../services/ragContext');
const { getCategoryScoringPrompt } = require('../../services/categoryScoringService');
const {
  RCA_SCORING_PROMPT_TEMPLATE,
  GUESSTIMATE_SCORING_PROMPT_TEMPLATE,
} = require('../../services/openaiService');

const scoreAnswer = {
  name: 'score_answer',
  description: `Score a PM interview answer using the same high-quality logic as direct scoring.

Args:
  - question (string, required): The question text
  - answer (string, required): The candidate's answer
  - category (string, optional): Question category
  - questionId (number, optional): Question ID for exemplar context
  - conversationHistory (array, optional): Conversation history for RCA/Guesstimate questions

Returns: JSON with scores, feedback, and detailed analysis matching the direct scoring quality.`,

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
        description: 'Question category (e.g., Product Design, RCA, Metrics, Guesstimate)',
      },
      questionId: {
        type: 'number',
        description: 'Question ID for retrieving exemplars',
      },
      conversationHistory: {
        type: 'array',
        description: 'Conversation history array (for RCA/Guesstimate questions)',
        items: {
          type: 'object',
        },
      },
    },
    required: ['question', 'answer'],
  },

  async func({ question, answer, category = null, questionId = null, conversationHistory = [] }) {
    try {
      // Use EXACT same prompt logic as scoreSession() in scoreService.js
      // This ensures agent scoring has same quality as direct scoring

      const categoryLower = (category || '').toLowerCase();
      const isRCAQuestion =
        categoryLower === 'rca' ||
        categoryLower.includes('root cause') ||
        categoryLower.includes('rca');

      const isGuesstimate =
        categoryLower.includes('guesstimate') ||
        categoryLower.includes('market sizing') ||
        categoryLower.includes('estimation') ||
        categoryLower === 'quantitative';

      let scoringPrompt;

      // Use RCA-specific prompt for RCA questions with conversation history (same as direct scoring)
      if (isRCAQuestion && conversationHistory && conversationHistory.length > 0) {
        scoringPrompt = RCA_SCORING_PROMPT_TEMPLATE(question, answer, conversationHistory);
      } else if (isGuesstimate && conversationHistory && conversationHistory.length > 0) {
        // Use Guesstimate-specific prompt for Guesstimate questions with conversation history
        scoringPrompt = GUESSTIMATE_SCORING_PROMPT_TEMPLATE(question, answer, conversationHistory);
      } else {
        // Get category-specific scoring prompt for other questions (same as direct scoring)
        scoringPrompt = getCategoryScoringPrompt(question, answer, category);
      }

      // Inject RAG context if enabled (same as direct scoring)
      const USE_RAG = process.env.USE_RAG !== 'false'; // Default to true
      if (USE_RAG) {
        try {
          const ragContext = await fetchRagContext({
            question,
            questionId,
            category,
            k: 4,
          });

          if (ragContext) {
            scoringPrompt = wrapPromptWithContext(scoringPrompt, ragContext);
            console.log('✓ RAG context injected into scoring prompt (agent tool)');
          }
        } catch (ragErr) {
          console.warn('RAG context failed in tool:', ragErr.message);
          // Continue without RAG - graceful degradation (same as direct scoring)
        }
      }

      // Validate answer text (same as direct scoring)
      if (!answer || !answer.trim()) {
        throw new Error('Cannot score an empty answer. Please provide an answer text.');
      }

      // Debug logging
      console.log('🔍 Tool received parameters:', {
        questionLength: question?.length || 0,
        answerLength: answer?.length || 0,
        answerPreview: answer?.substring(0, 100) || 'N/A',
        category,
        questionId,
        scoringPromptLength: scoringPrompt?.length || 0,
        promptIncludesAnswer: scoringPrompt?.includes(answer.substring(0, 50)) || false,
      });

      // Call scoring service (same as direct scoring)
      const { content, tokensUsed } = await callOpenAIForScoring(
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

module.exports = { scoreAnswer };

