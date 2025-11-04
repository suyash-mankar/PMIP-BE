-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base for PM content (rubrics, frameworks, baselines, case studies)
CREATE TABLE "KnowledgeDoc" (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,                -- 'curated' | 'theproductfolks' | 'generated' | 'article'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,  -- { category, doc_type, tags, company, difficulty, source_url, curation_score }
  embedding vector(1536),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "KnowledgeDoc_embedding_idx"
  ON "KnowledgeDoc" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX "KnowledgeDoc_source_idx" ON "KnowledgeDoc"(source);
CREATE INDEX "KnowledgeDoc_metadata_idx" ON "KnowledgeDoc" USING gin(metadata);

-- Long-term conversation/user memory for personalization
CREATE TABLE "ConversationMemory" (
  id SERIAL PRIMARY KEY,
  "userId" INT REFERENCES "User"(id) ON DELETE CASCADE,
  "sessionId" INT REFERENCES "PracticeSession"(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                  -- 'user' | 'assistant' | 'system'
  text TEXT NOT NULL,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "ConversationMemory_user_idx" ON "ConversationMemory"("userId");
CREATE INDEX "ConversationMemory_session_idx" ON "ConversationMemory"("sessionId");
CREATE INDEX "ConversationMemory_category_idx" ON "ConversationMemory"(category);
CREATE INDEX "ConversationMemory_embedding_idx"
  ON "ConversationMemory" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Resume profile for personalization and job matching
CREATE TABLE "ResumeProfile" (
  id SERIAL PRIMARY KEY,
  "userId" INT UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "rawText" TEXT NOT NULL,
  structured JSONB DEFAULT '{}'::jsonb,  -- { skills, experience, domains, level, title_variants }
  embedding vector(1536),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "ResumeProfile_user_idx" ON "ResumeProfile"("userId");
CREATE INDEX "ResumeProfile_embedding_idx"
  ON "ResumeProfile" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);

-- Canonical exemplar answers (human + AI) per question
CREATE TABLE "ExemplarAnswer" (
  id SERIAL PRIMARY KEY,
  "questionId" INT REFERENCES "Question"(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                -- 'theproductfolks' | 'ai_generated' | 'curated'
  author TEXT,
  title TEXT,
  content TEXT NOT NULL,               -- full 10/10 answer or curated human answer
  "keyPoints" JSONB DEFAULT '[]'::jsonb, -- pre-extracted bullets for fast coverage checks
  "qualityScore" INT DEFAULT 10,       -- curation score 1-10
  version INT DEFAULT 1,
  "sourceUrl" TEXT,
  "sourceHash" TEXT,                   -- detect upstream changes
  embedding vector(1536),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE("questionId", source, version)
);

CREATE INDEX "ExemplarAnswer_question_idx" ON "ExemplarAnswer"("questionId");
CREATE INDEX "ExemplarAnswer_source_idx" ON "ExemplarAnswer"(source);
CREATE INDEX "ExemplarAnswer_embedding_idx"
  ON "ExemplarAnswer" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Job postings for job scout agent
CREATE TABLE "JobPosting" (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,                -- 'linkedin' | 'indeed' | 'google_jobs' | 'ycombinator'
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  "rawText" TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,  -- { seniority, domain, skills, salary_range }
  embedding vector(1536),
  "postedAt" TIMESTAMPTZ,
  "scrapedAt" TIMESTAMPTZ DEFAULT now(),
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "JobPosting_source_idx" ON "JobPosting"(source);
CREATE INDEX "JobPosting_company_idx" ON "JobPosting"(company);
CREATE INDEX "JobPosting_posted_idx" ON "JobPosting"("postedAt" DESC);
CREATE INDEX "JobPosting_embedding_idx"
  ON "JobPosting" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Job recommendations sent to users
CREATE TABLE "JobRecommendation" (
  id SERIAL PRIMARY KEY,
  "userId" INT REFERENCES "User"(id) ON DELETE CASCADE,
  "jobId" INT REFERENCES "JobPosting"(id) ON DELETE CASCADE,
  score DECIMAL(3,2),                  -- similarity score 0-1
  "sentAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE("userId", "jobId")
);

CREATE INDEX "JobRecommendation_user_idx" ON "JobRecommendation"("userId");
CREATE INDEX "JobRecommendation_sent_idx" ON "JobRecommendation"("sentAt" DESC);

-- Flashcards generated from KB
CREATE TABLE "Flashcard" (
  id SERIAL PRIMARY KEY,
  "knowledgeDocId" INT REFERENCES "KnowledgeDoc"(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  difficulty TEXT,                     -- 'easy' | 'medium' | 'hard'
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "Flashcard_knowledge_idx" ON "Flashcard"("knowledgeDocId");
CREATE INDEX "Flashcard_category_idx" ON "Flashcard"(category);

-- User flashcard progress for spaced repetition
CREATE TABLE "FlashcardProgress" (
  id SERIAL PRIMARY KEY,
  "userId" INT REFERENCES "User"(id) ON DELETE CASCADE,
  "flashcardId" INT REFERENCES "Flashcard"(id) ON DELETE CASCADE,
  "lastReviewed" TIMESTAMPTZ,
  "nextReview" TIMESTAMPTZ,
  "easeFactor" DECIMAL(3,2) DEFAULT 2.5,
  interval INT DEFAULT 1,              -- days until next review
  repetitions INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE("userId", "flashcardId")
);

CREATE INDEX "FlashcardProgress_user_idx" ON "FlashcardProgress"("userId");
CREATE INDEX "FlashcardProgress_next_idx" ON "FlashcardProgress"("nextReview");


