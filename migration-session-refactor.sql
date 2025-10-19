-- Delete all existing data before schema migration
-- This ensures a clean migration to the new session-based structure

TRUNCATE TABLE "Event" CASCADE;
TRUNCATE TABLE "Score" CASCADE;
TRUNCATE TABLE "Session" CASCADE;
TRUNCATE TABLE "QuestionView" CASCADE;

-- Note: After running this, execute: npx prisma migrate dev --name session_refactor

