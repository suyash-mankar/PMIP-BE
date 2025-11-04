/**
 * User Memory Tool
 * Retrieves user's past conversations and answers for context
 */

const { memoryRetrieve } = require('../../utils/vector');

const userMemory = {
  name: 'user_memory',
  description: `Retrieve user's past conversation and answer history.

Args:
  - userId (number, required): User ID
  - query (string, optional): Semantic search query
  - k (number, optional): Number of memories to retrieve (default: 10)
  - category (string, optional): Filter by category

Returns: JSON array of past interactions with text, category, and metadata.`,

  schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'The user ID',
      },
      query: {
        type: 'string',
        description: 'Optional semantic search query',
      },
      k: {
        type: 'number',
        description: 'Number of memories to retrieve',
        default: 10,
      },
      category: {
        type: 'string',
        description: 'Optional category filter',
      },
    },
    required: ['userId'],
  },

  async func({ userId, query = null, k = 10, category = null }) {
    try {
      const memories = await memoryRetrieve({
        userId,
        query,
        k,
        category,
      });

      return JSON.stringify(
        memories.map(m => ({
          id: m.id,
          role: m.role,
          text: m.text.slice(0, 500), // truncate for context
          category: m.category,
          createdAt: m.createdAt,
          similarity: m.similarity || null,
        })),
        null,
        2
      );
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};

module.exports = { userMemory };
