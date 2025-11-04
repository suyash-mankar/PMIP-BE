/**
 * Knowledge Curator Agent
 * Ingests new PM content, summarizes, chunks, and stores in KB
 */

const { buildAgent } = require('../core/buildAgent');
const { creativeLLM } = require('../core/llm');
const { kbInsert } = require('../../utils/vector');

async function buildCuratorAgent() {
  const tools = [ingestContentTool, generateFlashcardsTool];

  const systemPrompt = `You are a knowledge curator responsible for ingesting, organizing, and summarizing PM content.

YOUR ROLE:
- Process new articles, case studies, and frameworks
- Extract key concepts and create summaries
- Generate flashcards for spaced repetition
- Organize content with proper metadata (category, tags, difficulty)
- Maintain high curation quality

WORKFLOW:
1. Use ingest_content tool to add new documents
2. Extract key points and summaries
3. Generate flashcards with generate_flashcards tool
4. Tag content appropriately (category, doc_type, difficulty, source_url)

CONTENT TYPES:
- Rubrics: Evaluation criteria for interview categories
- Frameworks: Structured approaches (CIRCLES, AARM, etc.)
- Baselines: Reference numbers for guesstimates
- Concepts: PM ideas, patterns, best practices
- Case Studies: Real examples with analysis
- Articles: Curated readings with summaries

OUTPUT:
JSON with:
- docsIngested: Number of documents added
- flashcardsCreated: Number of flashcards generated
- metadata: Categories and tags applied
- summary: Brief overview of ingested content`;

  return buildAgent({
    llm: creativeLLM,
    tools,
    systemPrompt,
    agentType: 'curator',
    maxIterations: 5,
  });
}

/**
 * Ingest Content Tool
 * Add content to knowledge base with metadata
 */
const ingestContentTool = {
  name: 'ingest_content',
  description: `Ingest content into the knowledge base.

Args:
  - source (string, required): Content source
  - title (string, required): Document title
  - content (string, required): Full content
  - metadata (object, required): category, doc_type, tags, difficulty, source_url

Returns: Document ID and confirmation.`,

  schema: {
    type: 'object',
    properties: {
      source: { type: 'string', description: 'Content source' },
      title: { type: 'string', description: 'Document title' },
      content: { type: 'string', description: 'Full content text' },
      metadata: {
        type: 'object',
        description: 'Metadata including category, doc_type, tags, etc.',
      },
    },
    required: ['source', 'title', 'content', 'metadata'],
  },

  async func({ source, title, content, metadata }) {
    try {
      // Extract key points from content (simple heuristic)
      const keyPoints = extractKeyPointsFromContent(content);

      const docId = await kbInsert({
        source,
        title,
        content,
        keyPoints: keyPoints.length > 0 ? keyPoints : null,
        metadata: {
          ...metadata,
          curation_score: 8, // default quality score
          ingested_at: new Date().toISOString(),
        },
      });

      return JSON.stringify({
        success: true,
        docId,
        title,
        keyPointsExtracted: keyPoints.length,
      });
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};

/**
 * Generate Flashcards Tool
 * Create flashcards from KB content for spaced repetition
 */
const generateFlashcardsTool = {
  name: 'generate_flashcards',
  description: `Generate flashcards from content for spaced repetition.

Args:
  - content (string, required): Source content
  - category (string, required): PM category
  - count (number, optional): Number of flashcards (default: 5)

Returns: Array of flashcard Q&A pairs.`,

  schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Source content' },
      category: { type: 'string', description: 'PM category' },
      count: {
        type: 'number',
        description: 'Number of flashcards',
        default: 5,
      },
    },
    required: ['content', 'category'],
  },

  async func({ content, category, count = 5 }) {
    // Simple flashcard generation (can be enhanced with LLM)
    const flashcards = [];
    const lines = content.split('\n').filter(l => l.trim().length > 20);

    // Extract Q&A pairs from headings and bullet points
    for (let i = 0; i < Math.min(lines.length, count * 2); i++) {
      const line = lines[i].trim();
      if (line.startsWith('##') || line.startsWith('###')) {
        const question = line.replace(/^#{2,3}\s*/, '').replace(/[:?]/g, '');
        const answer = lines.slice(i + 1, i + 4).join(' ').slice(0, 200);
        if (answer.length > 30) {
          flashcards.push({
            question: `What is ${question}?`,
            answer,
            category,
          });
        }
      }
    }

    return JSON.stringify({
      flashcards: flashcards.slice(0, count),
      count: flashcards.length,
    });
  },
};

function extractKeyPointsFromContent(content) {
  const points = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('##') || trimmed.startsWith('###')) &&
      !trimmed.startsWith('####')
    ) {
      const point = trimmed
        .replace(/^#{2,3}\s*/, '')
        .replace(/[🎯📊💡🧭🚀🔍✨]/g, '')
        .trim();
      if (point.length > 5 && point.length < 100) {
        points.push(point);
      }
    } else if (trimmed.startsWith('- **') && trimmed.endsWith('**')) {
      const point = trimmed.replace(/^- \*\*/, '').replace(/\*\*$/, '').trim();
      if (point.length > 5 && point.length < 100) {
        points.push(point);
      }
    }
  }

  return points.slice(0, 15); // max 15 key points
}

module.exports = { buildCuratorAgent };
