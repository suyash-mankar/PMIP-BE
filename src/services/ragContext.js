/**
 * RAG (Retrieval Augmented Generation) Context Service
 * Fetches relevant knowledge base and exemplar content to ground AI responses
 */

const { kbSearch, getExemplarsByQuestionId, getSimilarExemplars } = require('../utils/vector');

/**
 * Fetch relevant KB context for a question
 * @param {Object} params
 * @param {string} params.question - The question text
 * @param {string} params.category - Question category
 * @param {number} params.questionId - Question ID (optional)
 * @param {number} params.k - Number of results to fetch
 * @returns {Promise<string>} Formatted context string
 */
async function fetchRagContext({ question, category, questionId = null, k = 4 }) {
  try {
    const contextParts = [];

    // 1. Fetch category-specific rubric and framework
    if (category) {
      const rubricDocs = await kbSearch({
        query: `${category} scoring rubric evaluation criteria`,
        k: 2,
        filters: { category, doc_type: 'rubric' },
      });

      if (rubricDocs.length > 0) {
        contextParts.push('# RUBRIC REFERENCE');
        rubricDocs.forEach((doc, idx) => {
          contextParts.push(`## ${doc.title}`);
          contextParts.push(doc.content.slice(0, 1200)); // truncate for token efficiency
          if (idx < rubricDocs.length - 1) contextParts.push('---');
        });
      }

      const frameworkDocs = await kbSearch({
        query: `${category} framework approach methodology`,
        k: 1,
        filters: { category, doc_type: 'framework' },
      });

      if (frameworkDocs.length > 0) {
        contextParts.push('\n# FRAMEWORK REFERENCE');
        contextParts.push(`## ${frameworkDocs[0].title}`);
        contextParts.push(frameworkDocs[0].content.slice(0, 1000));
      }
    }

    // 2. Fetch baseline numbers for guesstimates
    if (category && (category.toLowerCase().includes('guesstimate') || category.toLowerCase().includes('quantitative'))) {
      const baselineDocs = await kbSearch({
        query: 'guesstimate baseline numbers assumptions',
        k: 1,
        filters: { doc_type: 'baseline' },
      });

      if (baselineDocs.length > 0) {
        contextParts.push('\n# BASELINE NUMBERS');
        contextParts.push(baselineDocs[0].content.slice(0, 800));
      }
    }

    // 3. Fetch exemplar answers if questionId provided
    if (questionId) {
      const exemplars = await getExemplarsByQuestionId(questionId, { includeHuman: true });
      
      if (exemplars.length > 0) {
        contextParts.push('\n# EXEMPLAR REFERENCE');
        // Use the highest quality exemplar
        const best = exemplars[0];
        contextParts.push(`## ${best.title || 'Model Answer'}`);
        contextParts.push(`Source: ${best.source}`);
        
        // Include key points if available, otherwise snippet of content
        if (best.keyPoints && Array.isArray(best.keyPoints)) {
          contextParts.push('\nKey Points:');
          best.keyPoints.slice(0, 8).forEach(point => {
            contextParts.push(`- ${point}`);
          });
        } else {
          contextParts.push(best.content.slice(0, 1000));
        }
      }
    }

    // 4. General semantic search for relevant concepts
    const conceptDocs = await kbSearch({
      query: question,
      k: Math.max(1, k - contextParts.length),
      filters: category ? { category } : {},
    });

    if (conceptDocs.length > 0) {
      contextParts.push('\n# RELEVANT CONCEPTS');
      conceptDocs.slice(0, 2).forEach(doc => {
        contextParts.push(`## ${doc.title}`);
        contextParts.push(doc.content.slice(0, 600));
      });
    }

    if (contextParts.length === 0) {
      return null;
    }

    return contextParts.join('\n\n');
  } catch (error) {
    console.error('Error fetching RAG context:', error);
    return null;
  }
}

/**
 * Fetch exemplar context for comparison during scoring
 * @param {number} questionId - Question ID
 * @returns {Promise<Object|null>} Exemplar data
 */
async function fetchExemplarForComparison(questionId) {
  try {
    const exemplars = await getExemplarsByQuestionId(questionId, { includeHuman: false });
    
    if (exemplars.length === 0) {
      // Try to get similar exemplars
      const similar = await getSimilarExemplars(questionId, 1);
      if (similar.length > 0) {
        return {
          content: similar[0].content,
          keyPoints: similar[0].keyPoints,
          isSimilar: true,
          similarity: similar[0].similarity,
        };
      }
      return null;
    }

    const best = exemplars[0];
    return {
      content: best.content,
      keyPoints: best.keyPoints,
      isSimilar: false,
    };
  } catch (error) {
    console.error('Error fetching exemplar for comparison:', error);
    return null;
  }
}

/**
 * Wrap prompt with RAG context
 * @param {string} basePrompt - The original prompt
 * @param {string} context - RAG context string
 * @returns {string} Enhanced prompt
 */
function wrapPromptWithContext(basePrompt, context) {
  if (!context) return basePrompt;

  return `BEGIN CONTEXT

The following reference material should ground your evaluation. Use it to inform your assessment, but do not mention it explicitly in your feedback. If a needed fact is not in the context, rely on your knowledge.

${context}

END CONTEXT

${basePrompt}`;
}

/**
 * Inject RAG context instruction into system message
 * @param {string} systemMessage - Original system message
 * @returns {string} Enhanced system message
 */
function enhanceSystemMessage(systemMessage) {
  const contextInstruction = `

IMPORTANT: If BEGIN CONTEXT ... END CONTEXT is present in the user message, ground all reasoning primarily on that reference material. Use it to inform rubric application, framework adherence, and quality benchmarks. Do not change your output format or JSON structure.`;

  return systemMessage + contextInstruction;
}

module.exports = {
  fetchRagContext,
  fetchExemplarForComparison,
  wrapPromptWithContext,
  enhanceSystemMessage,
};
