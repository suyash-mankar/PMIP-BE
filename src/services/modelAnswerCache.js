/**
 * Model Answer Cache Service
 * Serves cached 10/10 answers from DB with fallback generation
 */

const { getExemplarsByQuestionId } = require('./exemplarService');
const { generateAIExemplar } = require('./exemplarService');

/**
 * Get model answer for a question (cached or generate)
 * @param {number} questionId - Question ID
 * @param {Object} question - Question object
 * @returns {Promise<Object>} Model answer
 */
async function getModelAnswer(questionId, question) {
  try {
    // Try to get cached AI-generated exemplar
    const exemplars = await getExemplarsByQuestionId(questionId, {
      includeHuman: false,
      includeAI: true,
    });

    const aiExemplar = exemplars.find((e) => e.source === 'ai_generated');

    if (aiExemplar) {
      console.log(`✓ Serving cached model answer for question ${questionId}`);
      return {
        content: aiExemplar.content,
        source: 'cached',
        qualityScore: aiExemplar.qualityScore,
        keyPoints: aiExemplar.keyPoints || [],
        cached: true,
      };
    }

    // No cached answer - generate new one
    console.log(`Generating new model answer for question ${questionId}`);
    const newExemplar = await generateAIExemplar(questionId, question);

    return {
      content: newExemplar.content,
      source: 'generated',
      qualityScore: newExemplar.qualityScore,
      keyPoints: newExemplar.keyPoints || [],
      cached: false,
    };
  } catch (error) {
    console.error('Error getting model answer:', error);
    throw error;
  }
}

/**
 * Check plagiarism by comparing with exemplars
 * @param {string} userAnswer - User's answer text
 * @param {number} questionId - Question ID
 * @returns {Promise<Object>} Plagiarism check result
 */
async function checkPlagiarism(userAnswer, questionId) {
  const { compareWithExemplar } = require('./exemplarService');

  try {
    const exemplars = await getExemplarsByQuestionId(questionId);

    if (exemplars.length === 0) {
      return {
        flagged: false,
        message: 'No exemplars available for comparison',
      };
    }

    // Compare with all exemplars
    const comparisons = await Promise.all(
      exemplars.map((ex) => compareWithExemplar(userAnswer, ex))
    );

    // Find highest similarity
    const maxSimilarity = Math.max(...comparisons.map((c) => c.similarity));
    const highestMatch = comparisons.find((c) => c.similarity === maxSimilarity);

    // Flag if similarity is suspiciously high
    const PLAGIARISM_THRESHOLD = 0.95;

    if (maxSimilarity >= PLAGIARISM_THRESHOLD) {
      return {
        flagged: true,
        similarity: maxSimilarity,
        message:
          'Your answer is very similar to an example answer. Try to demonstrate original reasoning and structure.',
        suggestion:
          'Focus on: unique examples, your own frameworks, different prioritization, personal insights',
        exemplarSource: exemplars.find(
          (e) =>
            compareWithExemplar(userAnswer, e).then((r) => r.similarity === maxSimilarity)
        )?.source,
      };
    }

    // Warn if similarity is moderately high
    const WARNING_THRESHOLD = 0.85;

    if (maxSimilarity >= WARNING_THRESHOLD) {
      return {
        flagged: false,
        warning: true,
        similarity: maxSimilarity,
        message:
          'Your answer shows some similarity to example patterns. Make sure to add your unique perspective.',
        suggestion: 'Consider: different use cases, alternative approaches, deeper trade-off analysis',
      };
    }

    return {
      flagged: false,
      similarity: maxSimilarity,
      message: 'Answer shows original structure and reasoning',
    };
  } catch (error) {
    console.error('Plagiarism check error:', error);
    // Gracefully degrade - don't block user
    return {
      flagged: false,
      error: 'Plagiarism check unavailable',
    };
  }
}

module.exports = {
  getModelAnswer,
  checkPlagiarism,
};

