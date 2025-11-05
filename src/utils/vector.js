const OpenAI = require('openai');
const { Pool } = require('pg');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Convert array to PostgreSQL vector literal
 */
function toVectorLiteral(arr) {
  return `[${arr.join(',')}]`;
}

/**
 * Embed text using OpenAI
 * @param {string} text - Text to embed
 * @param {string} model - Embedding model (default: text-embedding-3-large)
 * @returns {Promise<number[]>} Embedding vector
 */
async function embedText(text, model = 'text-embedding-3-large') {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot embed empty text');
  }

  const { data } = await openai.embeddings.create({
    model,
    input: text.slice(0, 8000), // safety truncation
    dimensions: 1536, // Ensure we get 1536 dimensions for pgvector compatibility
  });

  return data[0].embedding;
}

/**
 * Insert knowledge document into KB
 */
async function kbInsert({ source, title, content, keyPoints = null, metadata = {} }) {
  const emb = await embedText(content);
  
  // Store keyPoints in metadata if provided
  const finalMetadata = { ...metadata };
  if (keyPoints) {
    finalMetadata.keyPoints = keyPoints;
  }
  
  const result = await pool.query(
    `INSERT INTO "KnowledgeDoc"(source, title, content, metadata, embedding, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())
     RETURNING id`,
    [
      source,
      title,
      content,
      JSON.stringify(finalMetadata),
      toVectorLiteral(emb),
    ]
  );
  return result.rows[0].id;
}

/**
 * Semantic search over knowledge base
 */
async function kbSearch({ query, k = 5, filters = {} }) {
  const qEmb = await embedText(query);

  // Build metadata filter conditions
  const metadataConditions = [];
  const params = [toVectorLiteral(qEmb)];
  let paramIndex = 2;

  if (filters.category) {
    metadataConditions.push(`metadata->>'category' = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.doc_type) {
    metadataConditions.push(`metadata->>'doc_type' = $${paramIndex}`);
    params.push(filters.doc_type);
    paramIndex++;
  }

  if (filters.company) {
    metadataConditions.push(`metadata->>'company' = $${paramIndex}`);
    params.push(filters.company);
    paramIndex++;
  }

  const whereClause =
    metadataConditions.length > 0 ? `WHERE ${metadataConditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, source, title, content, metadata,
           1 - (embedding <=> $1::vector) AS similarity
    FROM "KnowledgeDoc"
    ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT ${k}`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Insert exemplar answer
 */
async function exemplarInsert({
  questionId,
  source,
  author = null,
  title = null,
  content,
  keyPoints = null,
  qualityScore = 10,
  version = 1,
  sourceUrl = null,
  sourceHash = null,
}) {
  const emb = await embedText(content);
  const result = await pool.query(
    `INSERT INTO "ExemplarAnswer"(
      "questionId", source, author, title, content, "keyPoints",
      "qualityScore", version, "sourceUrl", "sourceHash", embedding, "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, NOW(), NOW())
    ON CONFLICT ("questionId", source, version)
    DO UPDATE SET
      content = EXCLUDED.content,
      "keyPoints" = EXCLUDED."keyPoints",
      embedding = EXCLUDED.embedding,
      "sourceHash" = EXCLUDED."sourceHash",
      "updatedAt" = NOW()
    RETURNING id`,
    [
      questionId,
      source,
      author,
      title,
      content,
      keyPoints ? JSON.stringify(keyPoints) : null,
      qualityScore,
      version,
      sourceUrl,
      sourceHash,
      toVectorLiteral(emb),
    ]
  );
  return result.rows[0].id;
}

/**
 * Get exemplars by question ID
 */
async function getExemplarsByQuestionId(questionId, { includeHuman = true, source = null } = {}) {
  let sql = `
    SELECT id, "questionId", source, author, title, content, "keyPoints",
           "qualityScore", version, "sourceUrl", "createdAt"
    FROM "ExemplarAnswer"
    WHERE "questionId" = $1
  `;

  const params = [questionId];

  if (!includeHuman) {
    sql += ` AND source = 'ai_generated'`;
  } else if (source) {
    sql += ` AND source = $2`;
    params.push(source);
  }

  sql += ` ORDER BY "qualityScore" DESC, version DESC`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Get similar exemplars by embedding (nearest neighbors)
 */
async function getSimilarExemplars(questionId, topK = 3) {
  // First get the question text to embed
  const qRes = await pool.query(`SELECT text FROM "Question" WHERE id = $1`, [questionId]);
  if (qRes.rows.length === 0) return [];

  const qEmb = await embedText(qRes.rows[0].text);

  const sql = `
    SELECT e.id, e."questionId", e.source, e.title, e.content, e."keyPoints",
           1 - (e.embedding <=> $1::vector) AS similarity
    FROM "ExemplarAnswer" e
    WHERE e."questionId" != $2
    ORDER BY e.embedding <=> $1::vector
    LIMIT ${topK}
  `;

  const { rows } = await pool.query(sql, [toVectorLiteral(qEmb), questionId]);
  return rows;
}

/**
 * Insert conversation memory
 */
async function memoryInsert({ userId, sessionId, role, text, category = null, metadata = {} }) {
  const emb = await embedText(text);
  const result = await pool.query(
    `INSERT INTO "ConversationMemory"("userId", "sessionId", role, text, category, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
     RETURNING id`,
    [userId, sessionId, role, text, category, JSON.stringify(metadata), toVectorLiteral(emb)]
  );
  return result.rows[0].id;
}

/**
 * Retrieve user memory (recent or similar)
 */
async function memoryRetrieve({ userId, sessionId = null, query = null, k = 10, category = null }) {
  if (query) {
    // Semantic search
    const qEmb = await embedText(query);
    let sql = `
      SELECT id, "userId", "sessionId", role, text, category, metadata,
             1 - (embedding <=> $1::vector) AS similarity
      FROM "ConversationMemory"
      WHERE "userId" = $2
    `;
    const params = [toVectorLiteral(qEmb), userId];
    let paramIndex = 3;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY embedding <=> $1::vector LIMIT ${k}`;

    const { rows } = await pool.query(sql, params);
    return rows;
  } else {
    // Recent memory
    let sql = `
      SELECT id, "userId", "sessionId", role, text, category, metadata, "createdAt"
      FROM "ConversationMemory"
      WHERE "userId" = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (sessionId) {
      sql += ` AND "sessionId" = $${paramIndex}`;
      params.push(sessionId);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT ${k}`;

    const { rows } = await pool.query(sql, params);
    return rows;
  }
}

/**
 * Insert or update resume profile
 */
async function resumeProfileUpsert({ userId, rawText, structured }) {
  const emb = await embedText(rawText);
  const result = await pool.query(
    `INSERT INTO "ResumeProfile"("userId", "rawText", structured, embedding)
     VALUES ($1, $2, $3, $4::vector)
     ON CONFLICT ("userId")
     DO UPDATE SET
       "rawText" = EXCLUDED."rawText",
       structured = EXCLUDED.structured,
       embedding = EXCLUDED.embedding,
       "updatedAt" = now()
     RETURNING id`,
    [userId, rawText, JSON.stringify(structured), toVectorLiteral(emb)]
  );
  return result.rows[0].id;
}

/**
 * Get resume profile
 */
async function resumeProfileGet(userId) {
  const { rows } = await pool.query(
    `SELECT id, "userId", "rawText", structured, "createdAt", "updatedAt"
     FROM "ResumeProfile"
     WHERE "userId" = $1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Insert job posting
 */
async function jobPostingInsert({
  source,
  url,
  title,
  company,
  location,
  rawText,
  metadata = {},
  postedAt = null,
}) {
  const emb = await embedText(rawText || `${title} at ${company} - ${location}`);
  const result = await pool.query(
    `INSERT INTO "JobPosting"(source, url, title, company, location, "rawText", metadata, embedding, "postedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9)
     ON CONFLICT (source, url)
     DO UPDATE SET
       title = EXCLUDED.title,
       company = EXCLUDED.company,
       location = EXCLUDED.location,
       "rawText" = EXCLUDED."rawText",
       metadata = EXCLUDED.metadata,
       embedding = EXCLUDED.embedding,
       "postedAt" = EXCLUDED."postedAt"
     RETURNING id`,
    [
      source,
      url,
      title,
      company,
      location,
      rawText,
      JSON.stringify(metadata),
      toVectorLiteral(emb),
      postedAt,
    ]
  );
  return result.rows[0].id;
}

/**
 * Match jobs to resume
 */
async function jobMatchToResume(userId, topK = 10) {
  const profile = await resumeProfileGet(userId);
  if (!profile) return [];

  const profileEmb = await embedText(profile.rawText);

  const sql = `
    SELECT j.id, j.source, j.url, j.title, j.company, j.location, j.metadata, j."postedAt",
           1 - (j.embedding <=> $1::vector) AS similarity
    FROM "JobPosting" j
    ORDER BY j.embedding <=> $1::vector
    LIMIT ${topK}
  `;

  const { rows } = await pool.query(sql, [toVectorLiteral(profileEmb)]);
  return rows;
}

/**
 * Log agent execution
 */
async function logAgentExecution({
  userId = null,
  agentType,
  input,
  output,
  toolCalls = [],
  tokensUsed = 0,
  durationMs = 0,
  status = 'success',
  error = null,
}) {
  const result = await pool.query(
    `INSERT INTO "AgentExecution"("userId", "agentType", input, output, "toolCalls", "tokensUsed", "durationMs", status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      userId,
      agentType,
      JSON.stringify(input),
      JSON.stringify(output),
      JSON.stringify(toolCalls),
      tokensUsed,
      durationMs,
      status,
      error,
    ]
  );
  return result.rows[0].id;
}

module.exports = {
  embedText,
  toVectorLiteral,
  kbInsert,
  kbSearch,
  exemplarInsert,
  getExemplarsByQuestionId,
  getSimilarExemplars,
  memoryInsert,
  memoryRetrieve,
  resumeProfileUpsert,
  resumeProfileGet,
  jobPostingInsert,
  jobMatchToResume,
  logAgentExecution,
};
