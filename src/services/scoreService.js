const prisma = require('../config/database');
const { callOpenAIForScoring, parseAndValidateScore } = require('./openaiService');
const { getCategoryScoringPrompt } = require('./categoryScoringService');

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
      // Get category-specific scoring prompt
      const scoringPrompt = getCategoryScoringPrompt(
        session.question.text,
        session.answerText,
        session.question.category
      );

      // Call OpenAI with category-specific prompt
      const { content, tokensUsed } = await callOpenAIForScoring(
        session.question.text,
        session.answerText,
        scoringPrompt
      );

      // Parse and validate
      const scoreData = parseAndValidateScore(content);

      // Use overall_score from AI if available, otherwise calculate average
      let totalScore = scoreData.overall_score;
      
      if (!totalScore) {
        // Handle old field format
        if (scoreData.product_sense && scoreData.metrics && scoreData.prioritization) {
          totalScore = Math.round(
            (scoreData.product_sense +
              scoreData.metrics +
              scoreData.prioritization +
              scoreData.structure +
              scoreData.communication +
              scoreData.user_empathy) /
              6
          );
        }
        // Handle new Exponent-style field format
        else if (scoreData.user_centricity && scoreData.innovation && scoreData.technical_feasibility) {
          // Use weighted average as specified in the rubric
          totalScore = Math.round(
            (scoreData.user_centricity * 0.25 +
              scoreData.innovation * 0.20 +
              scoreData.technical_feasibility * 0.20 +
              scoreData.user_experience * 0.15 +
              scoreData.success_metrics * 0.10 +
              scoreData.iteration * 0.10)
          );
        }
        // Fallback: calculate average of all numeric fields (excluding overall_score)
        else {
          const scoringFields = Object.keys(scoreData).filter(key => 
            typeof scoreData[key] === 'number' && key !== 'overall_score'
          );
          if (scoringFields.length > 0) {
            const sum = scoringFields.reduce((acc, field) => acc + scoreData[field], 0);
            totalScore = Math.round(sum / scoringFields.length);
          } else {
            totalScore = 0;
          }
        }
      }

      // Convert feedback array to string with bullet points
      const feedbackString = Array.isArray(scoreData.feedback)
        ? scoreData.feedback.map((bullet, index) => `${index + 1}. ${bullet}`).join('\n')
        : scoreData.feedback;

      // Save to database (mapping field names to existing schema)
      const score = await prisma.score.create({
        data: {
          sessionId: session.id,
          // Map old field format
          structure: scoreData.structure || scoreData.user_centricity || 0,
          metrics: scoreData.metrics || scoreData.success_metrics || 0,
          prioritization: scoreData.prioritization || scoreData.innovation || 0,
          userEmpathy: scoreData.user_empathy || scoreData.user_experience || 0,
          communication: scoreData.communication || scoreData.technical_feasibility || 0,
          // For new format, we'll store additional fields in a JSON field if needed
          feedback: feedbackString,
          sampleAnswer: scoreData.model_answer,
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
            totalScore,
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
            context: 'openai_scoring',
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
