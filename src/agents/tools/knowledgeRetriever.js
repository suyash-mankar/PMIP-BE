/**
 * Knowledge Retriever Tool
 * Semantic search over PM knowledge base
 */

const { kbSearch } = require('../../utils/vector');

const knowledgeRetriever = {
  name: 'knowledge_retriever',
  description: `Semantic search over PM knowledge base. Use this to find rubrics, frameworks, baselines, concepts, and examples.
  
Args:
  - query (string, required): Search query
  - k (number, optional): Number of results (default: 5)
  - filters (object, optional): Filter by metadata (category, doc_type, company, etc.)

Returns: JSON array of matching documents with title, content, metadata, and similarity score.`,
  
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant knowledge',
      },
      k: {
        type: 'number',
        description: 'Number of results to return',
        default: 5,
      },
      filters: {
        type: 'object',
        description: 'Optional filters: {category, doc_type, company, etc.}',
        additionalProperties: true,
      },
    },
    required: ['query'],
  },

  async func({ query, k = 5, filters = {} }) {
    try {
      const results = await kbSearch({ query, k, filters });
      
      // Return concise snippets to keep context lean
      return JSON.stringify(
        results.map(r => ({
          id: r.id,
          title: r.title,
          snippet: r.content.slice(0, 1200),
          metadata: r.metadata,
          similarity: r.similarity,
        })),
        null,
        2
      );
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};

module.exports = { knowledgeRetriever };
