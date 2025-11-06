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

    // Save results first (so they're available even if email fails)
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

    // Send email (non-blocking - don't fail the entire graph if email fails)
    console.log(`[EmailSender] Attempting to send email to ${state.userEmail}...`);
    const result = await sendJobMatchEmail({
      to: state.userEmail,
      jobs: jobsForEmail,
      userIntent: state.jobIntentText,
      runId: state.runId,
    });

    if (!result.success) {
      // Email failed, but don't throw - mark as completed with email_failed status
      console.warn(`[EmailSender] Email sending failed: ${result.error}`);
      console.warn(`[EmailSender] Job results are saved in database, user can access them via API`);
      
      await prisma.jobMatchRun.update({
        where: { id: state.runId },
        data: {
          status: "completed_email_failed", // New status: completed but email failed
          jobsFound: state.topJobs.length,
          error: result.error || "Failed to send email",
        },
      });

      // Return success state even though email failed
      // The graph should complete successfully since results are saved
      return {
        ...state,
        emailSent: false,
        emailError: result.error,
      };
    }

    console.log(`[EmailSender] Email sent successfully to ${state.userEmail}`);

    // Update database with success
    await prisma.jobMatchRun.update({
      where: { id: state.runId },
      data: {
        status: "emailed",
        jobsFound: state.topJobs.length,
        emailSentAt: new Date(),
      },
    });

    return {
      ...state,
      emailSent: true,
    };
  } catch (error) {
    console.error("[EmailSender] Unexpected error:", error);
    
    // For unexpected errors (not email sending failures), still mark as completed_email_failed
    // since results are already saved
    try {
      await prisma.jobMatchRun.update({
        where: { id: state.runId },
        data: {
          status: "completed_email_failed",
          jobsFound: state.topJobs.length,
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
    
    // Don't throw - return success state so graph completes
    // Results are already saved, so the job matching is successful
    return {
      ...state,
      emailSent: false,
      emailError: error.message,
    };
  }
}

module.exports = { emailSenderNode };

