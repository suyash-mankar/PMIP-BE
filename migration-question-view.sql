-- Migration: Add QuestionView table for tracking viewed questions
-- Run this SQL manually in your database

-- Create QuestionView table
CREATE TABLE IF NOT EXISTS "QuestionView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionView_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint to prevent duplicate views
CREATE UNIQUE INDEX "QuestionView_userId_questionId_key" ON "QuestionView"("userId", "questionId");

-- Create indexes for better query performance
CREATE INDEX "QuestionView_userId_idx" ON "QuestionView"("userId");
CREATE INDEX "QuestionView_questionId_idx" ON "QuestionView"("questionId");

-- Add foreign key constraints
ALTER TABLE "QuestionView" ADD CONSTRAINT "QuestionView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionView" ADD CONSTRAINT "QuestionView_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Optional: Backfill existing data (populate QuestionView from existing Session data)
-- This will mark questions as viewed if the user has submitted an answer to them
INSERT INTO "QuestionView" ("userId", "questionId", "viewedAt")
SELECT DISTINCT "userId", "questionId", MIN("createdAt") as "viewedAt"
FROM "Session"
GROUP BY "userId", "questionId"
ON CONFLICT ("userId", "questionId") DO NOTHING;

COMMIT;

