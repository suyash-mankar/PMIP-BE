-- Session Management Schema Migration
-- Run this SQL script on your database to apply the schema changes

-- Step 1: Delete existing data (as per plan)
TRUNCATE TABLE "Event" CASCADE;
TRUNCATE TABLE "Score" CASCADE;
TRUNCATE TABLE "Session" CASCADE;
TRUNCATE TABLE "QuestionView" CASCADE;

-- Step 2: Create new PracticeSession table
CREATE TABLE "PracticeSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- Step 3: Rename Session table to Answer
ALTER TABLE "Session" RENAME TO "Answer";

-- Step 4: Add practiceSessionId column to Answer table
ALTER TABLE "Answer" ADD COLUMN "practiceSessionId" INTEGER NOT NULL DEFAULT 1;

-- Step 5: Update Score table - rename sessionId to answerId
ALTER TABLE "Score" DROP CONSTRAINT "Score_sessionId_fkey";
ALTER TABLE "Score" RENAME COLUMN "sessionId" TO "answerId";
ALTER TABLE "Score" ADD CONSTRAINT "Score_answerId_key" UNIQUE ("answerId");

-- Step 6: Update Event table - rename sessionId to answerId
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_sessionId_fkey";
ALTER TABLE "Event" RENAME COLUMN "sessionId" TO "answerId";

-- Step 7: Add foreign key constraints
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Answer" ADD CONSTRAINT "Answer_practiceSessionId_fkey" 
    FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Score" ADD CONSTRAINT "Score_answerId_fkey" 
    FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_answerId_fkey" 
    FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Create indexes
CREATE INDEX "PracticeSession_userId_idx" ON "PracticeSession"("userId");
CREATE INDEX "PracticeSession_status_idx" ON "PracticeSession"("status");
CREATE INDEX "Answer_practiceSessionId_idx" ON "Answer"("practiceSessionId");
CREATE INDEX "Score_answerId_idx" ON "Score"("answerId");
CREATE INDEX "Event_answerId_idx" ON "Event"("answerId");

-- Note: After running this, execute: npx prisma generate

