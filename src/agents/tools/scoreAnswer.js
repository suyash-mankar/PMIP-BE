/**
 * Score Answer Tool
 * Wraps the existing scoring service for agent use
 */

const { callOpenAIForScoring } = require('../../services/openaiService');
const { fetchRagContext, wrapPromptWithContext } = require('../../services/ragContext');
const { getCategoryScoringPrompt } = require('../../services/categoryScoringService');

const scoreAnswer = {
  name: 'score_answer',
  description: `Score a PM interview answer using rubrics and RAG context.

Args:
  - question (string, required): The question text
  - answer (string, required): The candidate's answer
  - category (string, optional): Question category
  - questionId (number, optional): Question ID for exemplar context

Returns: JSON with scores, feedback, and detailed analysis.`,

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
    },
    required: ['question', 'answer'],
  },

  async func({ question, answer, category = null, questionId = null }) {
    try {
      // Build base prompt
      let scoringPrompt = category
        ? getCategoryScoringPrompt(question, answer, category)
        : `Evaluate this PM interview answer:\n\nQuestion: ${question}\n\nAnswer: ${answer}`;

      // Inject RAG context if questionId/category provided
      if (questionId || category) {
        try {
          const ragContext = await fetchRagContext({
            question,
            questionId,
            category,
            k: 4,
          });

          if (ragContext) {
            scoringPrompt = wrapPromptWithContext(scoringPrompt, ragContext);
          }
        } catch (ragErr) {
          console.warn('RAG context failed in tool:', ragErr.message);
        }
      }

      // Call scoring service
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
