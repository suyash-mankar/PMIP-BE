/**
 * Exemplar Service
 * Manages exemplar answers for questions (human and AI generated)
 */

const {
  exemplarInsert,
  getExemplarsByQuestionId,
  getSimilarExemplars,
  embedText,
} = require('../utils/vector');

/**
 * Get best exemplar for a question (prioritizes AI generated, then human)
 */
async function getBestExemplar(questionId) {
  const exemplars = await getExemplarsByQuestionId(questionId, { includeHuman: true });
  
  if (exemplars.length === 0) {
    return null;
  }

  // Prioritize AI generated with version 1, then highest quality
  const aiExemplars = exemplars.filter(e => e.source === 'ai_generated');
  if (aiExemplars.length > 0) {
    return aiExemplars[0];
  }

  // Fall back to human exemplars
  return exemplars[0];
}

/**
 * Store a new exemplar answer
 */
async function storeExemplar(data) {
  return await exemplarInsert(data);
}

/**
 * Compare user answer to exemplar
 * Returns similarity score and coverage analysis
 */
async function compareToExemplar(userAnswer, questionId) {
  const exemplar = await getBestExemplar(questionId);
  
  if (!exemplar) {
    return {
      hasSimilar: false,
      similarity: 0,
      coverage: 0,
      missingPoints: [],
    };
  }

  // Compute embedding similarity
  const userEmb = await embedText(userAnswer);
  const exemplarEmb = await embedText(exemplar.content);
  
  // Cosine similarity
  const dotProduct = userEmb.reduce((sum, val, i) => sum + val * exemplarEmb[i], 0);
  const userMag = Math.sqrt(userEmb.reduce((sum, val) => sum + val * val, 0));
  const exemplarMag = Math.sqrt(exemplarEmb.reduce((sum, val) => sum + val * val, 0));
  const similarity = dotProduct / (userMag * exemplarMag);

  // Coverage analysis (key points)
  let coverage = 0;
  const missingPoints = [];
  
  if (exemplar.keyPoints && Array.isArray(exemplar.keyPoints)) {
    const lowerAnswer = userAnswer.toLowerCase();
    const totalPoints = exemplar.keyPoints.length;
    let hitCount = 0;

    for (const point of exemplar.keyPoints) {
      const lowerPoint = point.toLowerCase();
      // Simple keyword matching (can be enhanced with fuzzy matching)
      const keywords = lowerPoint.split(/\s+/).filter(w => w.length > 4);
      const hits = keywords.filter(kw => lowerAnswer.includes(kw)).length;
      
      if (hits >= keywords.length * 0.5) {
        hitCount++;
      } else {
        missingPoints.push(point);
      }
    }

    coverage = hitCount / totalPoints;
  }

  return {
    hasSimilar: true,
    similarity: Math.max(0, Math.min(1, similarity)), // clamp to [0, 1]
    coverage,
    missingPoints: missingPoints.slice(0, 5), // top 5 missing
    exemplarSource: exemplar.source,
    exemplarQuality: exemplar.qualityScore,
  };
}

/**
 * Check for potential plagiarism (very high similarity)
 */
async function checkPlagiarism(userAnswer, questionId, threshold = 0.95) {
  const comparison = await compareToExemplar(userAnswer, questionId);

    return {
    isPotentialPlagiarism: comparison.similarity >= threshold,
    similarity: comparison.similarity,
    warning: comparison.similarity >= threshold 
      ? 'Your answer is very similar to the model answer. Try to use your own words and structure.'
      : null,
  };
}

/**
 * Get exemplars for multiple questions (batch)
 */
async function getBatchExemplars(questionIds) {
  const results = {};
  
  for (const qid of questionIds) {
    const exemplar = await getBestExemplar(qid);
    if (exemplar) {
      results[qid] = exemplar;
    }
  }

    return results;
}

module.exports = {
  getBestExemplar,
  storeExemplar,
  compareToExemplar,
  checkPlagiarism,
  getBatchExemplars,
  getExemplarsByQuestionId,
  getSimilarExemplars,
};
