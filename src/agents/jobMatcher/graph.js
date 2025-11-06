const { prisma } = require("../../config/database");
const { initialState } = require("./state");
const { ingestResumeNode } = require("./nodes/ingestResume");
const { parseResumeAgent } = require("./nodes/parseResume");
const { intentParserAgent } = require("./nodes/parseIntent");
const { queryBuilderNode } = require("./nodes/queryBuilder");
const { aggregatorSearchAgent } = require("./nodes/aggregatorSearch");
const { normalizeAndDedupNode } = require("./nodes/normalizeAndDedup");
const { rankerAgent } = require("./nodes/ranker");
const { rationaleAgent } = require("./nodes/rationale");
const { emailSenderNode } = require("./nodes/emailSender");

/**
 * Job Match Graph Runner
 * Orchestrates the multi-agent workflow
 * 
 * This is a supervisor/worker pattern where the graph coordinates
 * execution through nodes with error handling and state management
 */
async function runJobMatchGraph(input) {
  const startTime = Date.now();
  
  console.log(`\n========================================`);
  console.log(`[JobMatchGraph] Starting for runId: ${input.runId}`);
  console.log(`========================================\n`);

  // Initialize state
  let state = {
    ...initialState,
    ...input,
    metadata: {
      ...initialState.metadata,
      startTime: new Date().toISOString(),
    },
  };

  try {
    // Ensure database connection is established
    try {
      await prisma.$connect();
    } catch (connectError) {
      console.warn("[JobMatchGraph] Database connection check failed, continuing anyway...");
    }

    // Update status to running
    await prisma.jobMatchRun.update({
      where: { id: input.runId },
      data: { status: "running" },
    });

    // Execute nodes in sequence
    console.log("[JobMatchGraph] Step 1: Ingest Resume");
    state = await ingestResumeNode(state);

    console.log("[JobMatchGraph] Step 2: Parse Resume");
    state = await parseResumeAgent(state);

    console.log("[JobMatchGraph] Step 3: Parse Intent");
    state = await intentParserAgent(state);

    console.log("[JobMatchGraph] Step 4: Build Queries");
    state = await queryBuilderNode(state);

    console.log("[JobMatchGraph] Step 5: Search Jobs (Aggregator)");
    state = await aggregatorSearchAgent(state);

    // Conditional LinkedIn search
    const LINKEDIN_THRESHOLD = 20; // Minimum jobs needed
    if (state.jobsRaw.length < LINKEDIN_THRESHOLD && process.env.LINKEDIN_ENABLED === "true") {
      console.log("[JobMatchGraph] Step 5b: Search Jobs (LinkedIn) - SKIPPED (not implemented)");
      state.metadata.linkedinAttempted = true;
      // LinkedIn search would go here
    }

    console.log("[JobMatchGraph] Step 6: Normalize and Deduplicate");
    state = await normalizeAndDedupNode(state);

    console.log("[JobMatchGraph] Step 7: Rank Jobs");
    state = await rankerAgent(state);

    console.log("[JobMatchGraph] Step 8: Generate Rationale");
    state = await rationaleAgent(state);

    console.log("[JobMatchGraph] Step 9: Send Email");
    state = await emailSenderNode(state);

    // Success
    state.metadata.endTime = new Date().toISOString();
    const duration = Date.now() - startTime;

    console.log(`\n========================================`);
    console.log(`[JobMatchGraph] Completed successfully`);
    console.log(`[JobMatchGraph] Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`[JobMatchGraph] Jobs found: ${state.topJobs.length}`);
    console.log(`========================================\n`);

    return {
      success: true,
      runId: input.runId,
      jobsFound: state.topJobs.length,
    };
  } catch (error) {
    console.error(`\n[JobMatchGraph] ERROR:`, error);

    // Update database with error (handle connection errors gracefully)
    try {
      // Try to ensure connection before updating
      try {
        await prisma.$connect();
      } catch (connectErr) {
        console.warn("[JobMatchGraph] Cannot connect to database for error logging");
      }
      
      await prisma.jobMatchRun.update({
        where: { id: input.runId },
        data: {
          status: "error",
          error: error.message,
          metadata: state.metadata,
        },
      });
    } catch (dbError) {
      console.error("[JobMatchGraph] Failed to update error status:", dbError.message);
      // Don't throw - we've already logged the error
    }

    console.log(`\n========================================`);
    console.log(`[JobMatchGraph] Failed`);
    console.log(`[JobMatchGraph] Error: ${error.message}`);
    console.log(`========================================\n`);

    return {
      success: false,
      runId: input.runId,
      error: error.message,
    };
  }
}

module.exports = { runJobMatchGraph };

