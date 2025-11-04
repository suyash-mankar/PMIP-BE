# Agents & Knowledge Base Setup Guide

## Overview

This implementation adds a multi-agent system powered by LangChain and a pgvector-backed knowledge base to your PM Interview Practice platform. The system enhances AI capabilities with:

- **RAG (Retrieval-Augmented Generation)**: Grounds scoring and clarifications in documented frameworks
- **Smart Agents**: Specialized agents for different tasks (interviewing, evaluation, curriculum planning, job search)
- **Knowledge Base**: Vector-backed storage of rubrics, frameworks, exemplars, and case studies
- **Personalization**: Resume analysis, user memory, and adaptive recommendations

## Architecture

### Data Layer
- **PostgreSQL + pgvector**: Main database with vector extensions
- **Tables**: `KnowledgeDoc`, `ExemplarAnswer`, `ConversationMemory`, `ResumeProfile`, `JobPosting`, `Flashcard`

### Agents Layer
- **Interviewer Agent**: Conducts adaptive mock interviews
- **Evaluator Agent**: Scores with rubric/exemplar comparisons
- **Curriculum Planner**: Generates personalized weekly plans
- **Job Scout**: Finds and ranks relevant PM jobs
- **Knowledge Curator**: Ingests and maintains KB content

### Tools
- `knowledge_retriever`: Semantic search over KB
- `exemplar_fetch`: Get 10/10 answers
- `user_memory`: Recall past performance
- `score_answer`: Existing scoring with RAG

## Setup Instructions

### 1. Database Migration

Run the pgvector migration:

```bash
cd PMIP-BE

# Option A: Apply migration directly
psql $DATABASE_URL -f prisma/migrations/20250104000000_add_pgvector_kb_tables/migration.sql

# Option B: Use Prisma (after updating schema)
npx prisma migrate deploy
```

### 2. Install Dependencies

```bash
# Install LangChain and related packages
npm install @langchain/openai langchain @langchain/core zod

# Already installed: axios, cheerio, pg
```

### 3. Environment Variables

Add to `.env`:

```bash
# Enable RAG (default: true)
USE_RAG=true

# Optional: Add job API keys for production
SERPAPI_KEY=your_serpapi_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

# Optional: Email service (SendGrid, Resend, etc.)
SENDGRID_API_KEY=your_sendgrid_key
```

### 4. Seed Knowledge Base

```bash
# Seed core rubrics and frameworks
node scripts/seed-knowledge-base.js
```

Expected output:
```
✅ Successfully added: 6 documents
- RCA Interview Framework
- Guesstimate Framework & Baselines
- Product Design Interview Framework
- Product Metrics Framework
- Prioritization Frameworks for PMs
- Common PM Interview Mistakes to Avoid
```

### 5. Scrape Product Folks Case Studies (with Answers)

```bash
# Scrape questions and answers
node scripts/scrape-productfolks-with-answers.js
```

This will:
- Fetch case study questions
- Scrape full answers from individual pages
- Store both in database with embeddings
- Rate limit: 1 request/second

### 6. Generate AI Exemplars

```bash
# Generate 10/10 AI answers for all questions
node scripts/generate-ai-exemplars.js --limit=100

# Or by category
node scripts/generate-ai-exemplars.js --category=RCA --limit=50
```

This generates and caches model answers for instant serving.

### 7. Update Routes

Add the resume route to `src/index.js`:

```javascript
const resumeRoutes = require('./routes/resume');

// Add after other routes
app.use('/api/resume', resumeRoutes);
```

### 8. Test the System

```bash
# Start the server
npm run dev

# Test resume analysis
curl -X POST http://localhost:5000/api/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Product Manager with 5 years experience..."}'

# Check if RAG is working (look for "✓ RAG context injected" in logs)
# Answer a question and see RAG-enhanced scoring
```

## Usage Examples

### 1. RAG-Enhanced Scoring

RAG is automatically enabled. When a user submits an answer:

```javascript
// In scoreService.js - automatically happens
const ragContext = await fetchScoringContext({
  question: answer.question.text,
  questionId: answer.question.id,
  category: answer.question.category,
});

// Context is prepended to existing prompts
// No prompt rewrites needed!
```

### 2. Resume Analysis

```javascript
POST /api/resume/analyze
{
  "text": "Product Manager with 5 years of experience at FAANG companies. Skilled in metrics, A/B testing, SQL, user research..."
}

Response:
{
  "structured": {
    "skills": ["product management", "metrics", "sql", ...],
    "level": "senior",
    "domains": ["SaaS", "E-commerce"],
    "technicalDepth": "high"
  },
  "plan": {
    "focusCategories": ["Product Strategy", "RCA"],
    "weeklyGoal": { "questionsPerWeek": 10, ... },
    "recommendations": [...],
    "resources": [...]
  }
}
```

### 3. Cached Model Answers

```javascript
const { getModelAnswer } = require('./services/modelAnswerCache');

// First call: generates and caches
const answer = await getModelAnswer(questionId, question);
// answer.cached = false

// Subsequent calls: instant
const cachedAnswer = await getModelAnswer(questionId, question);
// cachedAnswer.cached = true
```

### 4. Plagiarism Detection

```javascript
const { checkPlagiarism } = require('./services/modelAnswerCache');

const result = await checkPlagiarism(userAnswer, questionId);

if (result.flagged) {
  // similarity > 0.95
  // Show warning to user
}
```

### 5. Using Agents (Optional)

```javascript
// Interviewer Agent for clarifications
const { handleClarification } = require('./agents/subagents/interviewer');

const response = await handleClarification({
  question: "Why did DAU drop?",
  category: "RCA",
  userMessage: "Can you share the timeline?",
  userId: 123,
  conversationHistory: [...]
});

// Evaluator Agent for scoring
const { evaluateAnswer } = require('./agents/subagents/evaluator');

const evaluation = await evaluateAnswer({
  question: "Design a feature...",
  answer: "User's answer text...",
  questionId: 456,
  category: "Product Design",
  userId: 123
});
```

### 6. Weekly Insights Job

Set up a cron job:

```bash
# crontab -e
0 9 * * 1 cd /path/to/PMIP-BE && node scripts/weekly-insights-job.js
```

Or use a scheduler like node-cron, pm2-cron, or Railway cron.

### 7. Job Scout (When APIs Added)

```javascript
const { findJobs } = require('./agents/subagents/jobScout');

const jobs = await findJobs({
  userId: 123,
  query: 'Product Manager',
  location: 'San Francisco',
  limit: 10
});

// Returns ranked jobs based on user's resume embedding
```

## File Structure

```
PMIP-BE/
├── prisma/
│   ├── schema.prisma               # Updated with vector models
│   └── migrations/
│       └── 20250104.../migration.sql
├── src/
│   ├── agents/
│   │   ├── core/
│   │   │   ├── llm.js              # Shared LLM clients
│   │   │   └── buildAgent.js       # Agent builder utility
│   │   ├── tools/
│   │   │   ├── knowledgeRetriever.js
│   │   │   ├── exemplarFetch.js
│   │   │   ├── userMemory.js
│   │   │   ├── scoreAnswer.js
│   │   │   └── index.js
│   │   └── subagents/
│   │       ├── interviewer.js      # Interview conductor
│   │       ├── evaluator.js        # Answer evaluator
│   │       ├── curriculum.js       # Weekly planner
│   │       ├── jobScout.js         # Job finder
│   │       └── curator.js          # KB maintainer
│   ├── controllers/
│   │   └── resumeController.js     # Resume analysis
│   ├── routes/
│   │   └── resume.js               # Resume routes
│   ├── services/
│   │   ├── ragContext.js           # RAG context fetcher
│   │   ├── exemplarService.js      # Exemplar management
│   │   ├── modelAnswerCache.js     # Cache + plagiarism
│   │   ├── emailService.js         # Email sender
│   │   └── jobIntegration.js       # Job API wrapper
│   └── utils/
│       └── vector.js               # Vector operations
└── scripts/
    ├── seed-knowledge-base.js      # Seed KB
    ├── scrape-productfolks-with-answers.js
    ├── generate-ai-exemplars.js    # Batch exemplar generation
    └── weekly-insights-job.js      # Weekly email job
```

## Key Features

### ✅ Phase 1 (Complete)
- [x] pgvector tables and migrations
- [x] Vector utils (embed, search, insert)
- [x] KB seeding with rubrics/frameworks
- [x] Product Folks scraper with full answers
- [x] AI exemplar batch generation
- [x] RAG integration in scoring/clarification
- [x] Resume analyzer endpoint

### ✅ Phase 2 (Complete)
- [x] LangChain agent core
- [x] Interviewer Agent
- [x] Evaluator Agent  
- [x] User memory tool
- [x] Curriculum Planner Agent
- [x] Weekly insights email job

### ✅ Phase 3 (Complete)
- [x] Job Scout Agent
- [x] Job API integration (placeholders for production keys)
- [x] Knowledge Curator Agent
- [x] Flashcard generation
- [x] Model answer caching
- [x] Plagiarism detection

## Performance & Costs

### Vector Operations
- **Embedding**: ~$0.00013/1K tokens (text-embedding-3-large)
- **Storage**: ~6KB per 1536-dim vector
- **Search**: Fast (<50ms for 10K docs with IVFFlat)

### LLM Usage
- **RAG context**: Adds ~500-1000 tokens per request
- **Agent calls**: 2-5 tool calls typical = ~2000-5000 tokens
- **Net savings**: RAG reduces hallucinations, improving quality/token

### Caching Benefits
- Model answers: Generate once, serve instantly
- KB lookups: Fast retrieval vs regenerating frameworks
- Embeddings: Precomputed for instant similarity

## Troubleshooting

### "pgvector extension not found"
```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### "No RAG context injected" in logs
- Check `USE_RAG` env var
- Verify KB has been seeded
- Check OpenAI API key for embeddings

### Slow vector searches
- Ensure IVFFlat indexes are created
- Increase `lists` parameter for larger datasets
- Consider HNSW index for very large KBs

### Agent timeouts
- Reduce `maxIterations` in buildAgent calls
- Simplify tool descriptions
- Check network latency to OpenAI

### Job API integration
- Add real API keys in production
- Implement rate limiting
- Cache job data to reduce API calls

## Next Steps

1. **Production Deployment**
   - Apply migrations to production DB
   - Seed KB in production
   - Generate exemplars for all questions
   - Set up weekly insights cron job

2. **Email Integration**
   - Add SendGrid/Resend API key
   - Update email templates in `emailService.js`
   - Test weekly insights flow

3. **Job APIs**
   - Sign up for SerpAPI, RapidAPI, or Adzuna
   - Add keys to environment
   - Test job search and ingestion
   - Set up daily job refresh cron

4. **Frontend Integration**
   - Add Resume Upload page
   - Show RAG-enhanced feedback
   - Display cached model answers
   - Add plagiarism warnings
   - Weekly insights dashboard

5. **Monitoring**
   - Track vector DB size and query performance
   - Monitor embedding costs
   - Log agent tool usage
   - Track cache hit rates

## Support

For issues or questions:
- Check logs for "✓ RAG context" or "❌" error messages
- Verify pgvector extension is installed
- Ensure all dependencies are installed
- Review environment variables

## References

- [LangChain JS Docs](https://js.langchain.com/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Product Folks Case Studies](https://www.theproductfolks.com/product-management-case-studies)

