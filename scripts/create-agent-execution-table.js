require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function createAgentExecutionTable() {
  try {
    console.log('Creating AgentExecution table...');
    
    const sql = `
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

      CREATE INDEX IF NOT EXISTS "AgentExecution_userId_idx" ON "AgentExecution"("userId");
      CREATE INDEX IF NOT EXISTS "AgentExecution_agentType_idx" ON "AgentExecution"("agentType");
      CREATE INDEX IF NOT EXISTS "AgentExecution_status_idx" ON "AgentExecution"("status");
      CREATE INDEX IF NOT EXISTS "AgentExecution_createdAt_idx" ON "AgentExecution"("createdAt");
    `;
    
    await pool.query(sql);
    console.log('✓ AgentExecution table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    process.exit(1);
  }
}

createAgentExecutionTable();

