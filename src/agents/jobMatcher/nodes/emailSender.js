const { sendJobMatchEmail } = require("../../../services/email/nodemailer");
const { prisma } = require("../../../config/database");

/**
 * Email Sender Node
 * Sends job matches via email
 */
async function emailSenderNode(state) {
  console.log("[EmailSender] Starting...");

  try {
    if (state.topJobs.length === 0) {
      throw new Error("No jobs to send");
    }

    // Prepare jobs for email
    const jobsForEmail = state.topJobs.map((job) => ({
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      postedDate: job.postedDate,
      applyUrl: job.applyUrl,
      score: job.score,
      rationale: job.rationale,
    }));

    // Send email
    const result = await sendJobMatchEmail({
      to: state.userEmail,
      jobs: jobsForEmail,
      userIntent: state.jobIntentText,
      runId: state.runId,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log(`[EmailSender] Email sent successfully to ${state.userEmail}`);

    // Update database
    await prisma.jobMatchRun.update({
      where: { id: state.runId },
      data: {
        status: "emailed",
        jobsFound: state.topJobs.length,
        emailSentAt: new Date(),
      },
    });

    // Save results
    await prisma.jobMatchResult.createMany({
      data: jobsForEmail.map((job) => ({
        runId: state.runId,
        jobTitle: job.jobTitle,
        company: job.company,
        location: job.location || null,
        description: null, // Don't store full descriptions
        applyUrl: job.applyUrl,
        salary: job.salary || null,
        postedDate: job.postedDate || null,
        source: "aggregator",
        score: job.score,
        rationale: job.rationale || null,
        rawData: {},
      })),
    });

    return {
      ...state,
      emailSent: true,
    };
  } catch (error) {
    console.error("[EmailSender] Error:", error);
    
    // Update database with error
    try {
      await prisma.jobMatchRun.update({
        where: { id: state.runId },
        data: {
          status: "error",
          error: error.message,
        },
      });
    } catch (dbError) {
      console.error("[EmailSender] DB update error:", dbError);
    }

    state.metadata.errors.push({
      node: "emailSender",
      error: error.message,
    });
    throw error;
  }
}

module.exports = { emailSenderNode };

