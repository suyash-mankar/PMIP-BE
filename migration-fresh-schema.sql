-- Fresh Schema Migration for Session Management
-- This script creates the new schema from scratch
-- Safe to run on existing database (will clear data as requested)

-- Step 1: Drop all existing tables in correct order (to handle foreign keys)
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "Score" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "Answer" CASCADE;
DROP TABLE IF EXISTS "answer" CASCADE;
DROP TABLE IF EXISTS "PracticeSession" CASCADE;
DROP TABLE IF EXISTS "QuestionView" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;

-- Step 2: Create PracticeSession table
CREATE TABLE "PracticeSession" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 3: Create Answer table (replaces old Session table)
CREATE TABLE "Answer" (
    "id" SERIAL PRIMARY KEY,
    "practiceSessionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answerText" TEXT NOT NULL,
    "transcript" TEXT,
    "timeTaken" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Answer_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 4: Create Score table (now references Answer instead of Session)
CREATE TABLE "Score" (
    "id" SERIAL PRIMARY KEY,
    "answerId" INTEGER NOT NULL UNIQUE,
    "structure" INTEGER NOT NULL,
    "metrics" INTEGER NOT NULL,
    "prioritization" INTEGER NOT NULL,
    "userEmpathy" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "sampleAnswer" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Score_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 5: Create Event table (now references Answer instead of Session)
CREATE TABLE "Event" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER,
    "answerId" INTEGER,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 6: Create QuestionView table
CREATE TABLE "QuestionView" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionView_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 7: Recreate Payment table (if needed)
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "paymentId" TEXT,
    "orderId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 8: Create Indexes for performance
CREATE INDEX "PracticeSession_userId_idx" ON "PracticeSession"("userId");
CREATE INDEX "PracticeSession_status_idx" ON "PracticeSession"("status");

CREATE INDEX "Answer_practiceSessionId_idx" ON "Answer"("practiceSessionId");
CREATE INDEX "Answer_userId_idx" ON "Answer"("userId");
CREATE INDEX "Answer_status_idx" ON "Answer"("status");

CREATE INDEX "Score_answerId_idx" ON "Score"("answerId");
CREATE INDEX "Score_status_idx" ON "Score"("status");

CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_answerId_idx" ON "Event"("answerId");
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

CREATE INDEX "QuestionView_userId_idx" ON "QuestionView"("userId");
CREATE INDEX "QuestionView_questionId_idx" ON "QuestionView"("questionId");
CREATE UNIQUE INDEX "QuestionView_userId_questionId_key" ON "QuestionView"("userId", "questionId");

CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- Done! Your database is now ready with the new schema

