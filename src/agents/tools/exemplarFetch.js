/**
 * Exemplar Fetch Tool
 * Retrieves exemplar answers for questions
 */

const {
  getExemplarsByQuestionId,
  getSimilarExemplars,
} = require('../../services/exemplarService');

const exemplarFetch = {
  name: 'exemplar_fetch',
  description: `Fetch exemplar (model) answers for a question.

Args:
  - questionId (number, required): The question ID
  - topK (number, optional): Number of similar exemplars (default: 2)
  - includeHuman (boolean, optional): Include human exemplars (default: true)

Returns: JSON with direct exemplars and similar exemplars.`,

  schema: {
    type: 'object',
    properties: {
      questionId: {
        type: 'number',
        description: 'The question ID to fetch exemplars for',
      },
      topK: {
        type: 'number',
        description: 'Number of similar exemplars to return',
        default: 2,
      },
      includeHuman: {
        type: 'boolean',
        description: 'Whether to include human exemplars',
        default: true,
      },
    },
    required: ['questionId'],
  },

  async func({ questionId, topK = 2, includeHuman = true }) {
    try {
      const direct = await getExemplarsByQuestionId(questionId, { includeHuman });
      const similar = await getSimilarExemplars(questionId, topK);

      return JSON.stringify(
        {
          direct: direct.map(e => ({
            id: e.id,
            source: e.source,
            title: e.title,
            keyPoints: e.keyPoints,
            quality: e.qualityScore,
            contentSnippet: e.content.slice(0, 1000),
          })),
          similar: similar.map(e => ({
            id: e.id,
            questionId: e.questionId,
            source: e.source,
            title: e.title,
            similarity: e.similarity,
            contentSnippet: e.content.slice(0, 800),
          })),
        },
        null,
        2
      );
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};

module.exports = { exemplarFetch };
