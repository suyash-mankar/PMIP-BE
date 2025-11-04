# Quick Start: Agents & KB System

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install @langchain/openai langchain @langchain/core zod
```

### 2. Run Migration
```bash
psql $DATABASE_URL -f prisma/migrations/20250104000000_add_pgvector_kb_tables/migration.sql
```

### 3. Seed KB
```bash
node scripts/seed-knowledge-base.js
```

### 4. Enable RAG (Already Default)
No action needed - RAG is enabled by default. To disable:
```bash
# .env
USE_RAG=false
```

### 5. Test It
Start server and answer a question. Look for:
```
✓ RAG context injected into scoring prompt
```

## What You Get Immediately

### ✅ RAG-Enhanced Scoring
- Existing prompts unchanged
- Grounded in KB rubrics/frameworks
- Better, more consistent feedback

### ✅ RAG-Enhanced Clarifications
- Interview responses use real baselines
- Framework-grounded suggestions
- More realistic mock interviews

### ✅ Cached Model Answers
- Generate once, serve instantly
- No more wait time for "Show 10/10 Answer"
- Consistent quality

## Optional: Generate Exemplars
```bash
# Generate for all questions (takes time!)
node scripts/generate-ai-exemplars.js --limit=10

# Or by category
node scripts/generate-ai-exemplars.js --category=RCA --limit=5
```

## Optional: Scrape Product Folks Answers
```bash
node scripts/scrape-productfolks-with-answers.js
```

## New Endpoints

### Resume Analysis
```bash
POST /api/resume/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Product Manager with 5 years..."
}
```

## Key Files

- **RAG Integration**: `src/services/ragContext.js` + `src/services/scoreService.js`
- **Vector Utils**: `src/utils/vector.js`
- **Agents**: `src/agents/subagents/*.js`
- **Tools**: `src/agents/tools/*.js`

## Check It's Working

1. **Scoring with RAG**:
   - Submit an answer
   - Check server logs for "✓ RAG context injected"
   - Notice more specific, framework-referenced feedback

2. **Clarifications with RAG**:
   - Ask a clarifying question (especially guesstimate)
   - Interviewer will provide realistic baselines
   - Responses grounded in frameworks

3. **Cached Answers**:
   - Request "Show 10/10 Answer" for a question
   - First time: generates (2-3 seconds)
   - Second time: instant from cache

## Costs

- **KB Seeding**: ~$0.05 (one-time)
- **Per Question RAG**: +~$0.001 (500 tokens context)
- **Exemplar Generation**: ~$0.05 per question (one-time, then cached)
- **Net**: Better quality, minimal cost increase

## Troubleshooting

### No RAG Context
```bash
# Check env
echo $USE_RAG  # should not be 'false'

# Check KB
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"KnowledgeDoc\";"
# should show > 0

# Reseed if needed
node scripts/seed-knowledge-base.js
```

### Slow Responses
- Normal: First exemplar generation takes 2-3s
- Subsequent calls are cached and instant
- RAG adds ~200ms for KB lookup

### Agent Errors
- Check OpenAI API key
- Verify dependencies installed
- Review logs for specific tool failures

## Next Steps

1. **Production**: Apply migration, seed KB
2. **Optional**: Generate all exemplars
3. **Optional**: Add resume endpoint to frontend
4. **Optional**: Set up weekly insights job
5. **Optional**: Integrate job APIs

## Full Documentation

See `AGENTS_AND_KB_SETUP.md` for complete details.

