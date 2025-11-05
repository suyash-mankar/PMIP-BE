-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentExecution" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "agentType" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "toolCalls" TEXT NOT NULL DEFAULT '[]',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentExecution_userId_idx" ON "AgentExecution"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentExecution_agentType_idx" ON "AgentExecution"("agentType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentExecution_status_idx" ON "AgentExecution"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentExecution_createdAt_idx" ON "AgentExecution"("createdAt");

