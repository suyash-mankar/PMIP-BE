const prisma = require('../config/database');
const { callOpenAIForScoring, parseAndValidateScore } = require('./openaiService');

const MAX_RETRIES = 2;

/**
 * Score a session using OpenAI with retry logic
 * @param {Object} session - Session object with question included
 * @returns {Promise<Object>} Score object
 */
async function scoreSession(session) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      // Call OpenAI
      const { content, tokensUsed } = await callOpenAIForScoring(
        session.question.text,
        session.answerText
      );

      // Parse and validate
      const scoreData = parseAndValidateScore(content);

      // Calculate total score (average)
      const totalScore = Math.round(
        (scoreData.structure +
          scoreData.metrics +
          scoreData.prioritization +
          scoreData.user_empathy +
          scoreData.communication) /
          5
      );

      // Save to database
      const score = await prisma.score.create({
        data: {
          sessionId: session.id,
          structure: scoreData.structure,
          metrics: scoreData.metrics,
          prioritization: scoreData.prioritization,
          userEmpathy: scoreData.user_empathy,
          communication: scoreData.communication,
          feedback: scoreData.feedback,
          sampleAnswer: scoreData.sample_answer,
          totalScore,
          tokensUsed,
          status: 'completed',
        },
      });

      // Update session status
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'scored' },
      });

      // Log event
      await prisma.event.create({
        data: {
          userId: session.userId,
          sessionId: session.id,
          eventType: 'openai_call',
          metadata: JSON.stringify({ 
            attempt: attempt + 1, 
            success: true,
            totalScore 
          }),
          tokensUsed,
        },
      });

      return score;
    } catch (error) {
      lastError = error;
      attempt++;
      console.error(`Scoring attempt ${attempt} failed:`, error.message);

      // Log failed attempt
      await prisma.event.create({
        data: {
          userId: session.userId,
          sessionId: session.id,
          eventType: 'error',
          metadata: JSON.stringify({ 
            attempt, 
            error: error.message,
            context: 'openai_scoring' 
          }),
        },
      });

      if (attempt <= MAX_RETRIES) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed - flag session for review
  console.error(`All scoring attempts failed for session ${session.id}`);

  const score = await prisma.score.create({
    data: {
      sessionId: session.id,
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      feedback: 'Automated scoring failed. This session has been flagged for manual review.',
      sampleAnswer: '',
      totalScore: 0,
      tokensUsed: 0,
      status: 'needs_review',
    },
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { status: 'needs_review' },
  });

  throw new Error(`Scoring failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
}

module.exports = { scoreSession };
