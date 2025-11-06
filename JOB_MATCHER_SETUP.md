# Job Matcher Setup Guide

## Overview
The Job Matcher feature uses a multi-agent LangGraph workflow to analyze resumes, search for jobs in India, and email curated matches.

## Required Dependencies

Add these to your `package.json`:

```bash
npm install pdf-parse mammoth nodemailer @langchain/openai
```

## Environment Variables

Add these to your `.env` file:

### OpenAI (Required)
```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

### Job Search API (Required - choose one)
```env
# Option 1: JSearch via RapidAPI (Recommended)
RAPIDAPI_KEY=your_rapidapi_key

# Option 2: SerpAPI (Alternative)
# SERPAPI_KEY=your_serpapi_key
```

### Email Service (Required)
Using Brevo (Sendinblue) free SMTP:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email
SMTP_PASS=your_brevo_smtp_key
SMTP_FROM_EMAIL=your_from_email
SMTP_FROM_NAME="PM Interview Practice - Job Matcher"
```

### Optional: Encryption for secrets
```env
ENCRYPTION_KEY=your_64_char_hex_encryption_key
```
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Optional: LinkedIn Integration
```env
LINKEDIN_ENABLED=false
```

### Optional: Ranking Score Weights (defaults shown)
```env
SCORE_WEIGHT_SEMANTIC=0.5
SCORE_WEIGHT_SKILL=0.2
SCORE_WEIGHT_RECENCY=0.15
SCORE_WEIGHT_SENIORITY=0.1
SCORE_WEIGHT_LOCATION=0.05
```

## Database Migration

Run the Prisma migration to add new models:

```bash
cd PMIP-BE
npx prisma migrate dev --name add_job_matcher_models
npx prisma generate
```

## Getting API Keys

### 1. OpenAI
- Go to https://platform.openai.com/api-keys
- Create a new API key
- Add credits to your account

### 2. RapidAPI (for JSearch)
- Sign up at https://rapidapi.com/
- Subscribe to JSearch API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Free tier: 1000 requests/month
- Copy your RapidAPI key

### 3. Brevo (Email)
- Sign up at https://www.brevo.com/
- Free tier: 300 emails/day
- Go to Settings → SMTP & API
- Generate SMTP key
- Use your login email as SMTP_USER

## Testing

### 1. Test Resume Parsing
```bash
curl -X POST http://localhost:4000/api/job-matcher/submit \
  -F "resumeFile=@/path/to/resume.pdf" \
  -F "userEmail=test@example.com" \
  -F "jobIntentText=Product Manager roles at AI companies in Bangalore"
```

### 2. Check Status
```bash
curl http://localhost:4000/api/job-matcher/status/{runId}
```

## Architecture

### Graph Flow
```
Start
  ↓
Ingest Resume (PDF/DOCX extraction)
  ↓
Parse Resume (LLM extracts skills, titles, seniority)
  ↓
Parse Intent (LLM extracts search constraints)
  ↓
Query Builder (Generate search queries)
  ↓
Aggregator Search (JSearch API, India filter)
  ↓
[Optional] LinkedIn Search (if < threshold results)
  ↓
Normalize & Dedup
  ↓
Ranker (Embeddings + heuristics)
  ↓
Rationale Generator (LLM explains fit)
  ↓
Email Sender (Nodemailer via Brevo)
  ↓
Done
```

### Database Schema
- `JobMatchRun`: Tracks each job matching request
- `JobMatchResult`: Stores top job matches
- `Secret`: Encrypted storage for sensitive data (e.g., LinkedIn cookies)

## Troubleshooting

### "Failed to extract text from PDF"
- Install pdf-parse: `npm install pdf-parse`
- Ensure PDF is not password-protected

### "Failed to extract text from DOCX"
- Install mammoth: `npm install mammoth`
- Ensure DOCX is valid

### "SMTP credentials not configured"
- Verify SMTP_USER and SMTP_PASS in .env
- Check Brevo account is active

### "RAPIDAPI_KEY not configured"
- Add RapidAPI key to .env
- Verify subscription to JSearch API

### Low-quality job matches
- Adjust score weights in .env
- Increase recency window (set to "all" for more results)
- Review user's job intent text for clarity

## Cost Estimates

### Per Job Match Request
- OpenAI API: ~$0.10-0.20 (3-5 LLM calls)
- RapidAPI (JSearch): ~$0.001 (3-5 searches, free tier available)
- Brevo SMTP: Free (300/day limit)
- **Total: ~$0.10-0.20 per request**

### Monthly (100 requests)
- ~$10-20/month

## Production Checklist

- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CORS for production domain
- [ ] Add rate limiting per user/IP
- [ ] Set up database backups
- [ ] Configure email templates with brand assets
- [ ] Test resume parsing with various formats
- [ ] Set up logging aggregation
- [ ] Add analytics tracking
- [ ] Document admin LinkedIn cookie upload process
- [ ] Configure alerts for failed runs

## Optional: LinkedIn Integration

LinkedIn scraping requires manual cookie setup:

1. Log in to LinkedIn
2. Extract `li_at` cookie from browser
3. Upload via admin endpoint:
```bash
curl -X POST http://localhost:4000/api/job-matcher/admin/linkedin-cookie \
  -H "Authorization: Bearer {admin_jwt}" \
  -H "Content-Type: application/json" \
  -d '{"li_at": "your_li_at_cookie_value"}'
```

**Note**: LinkedIn scraping may violate ToS. Use at your own risk. Primary job source should be aggregator APIs.

