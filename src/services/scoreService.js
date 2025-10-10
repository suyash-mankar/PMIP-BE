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
        // Handle new Exponent-style field format (product design)
        else if (
          scoreData.user_centricity &&
          scoreData.innovation &&
          scoreData.technical_feasibility
        ) {
          // Use weighted average as specified in the rubric
          totalScore = Math.round(
            scoreData.user_centricity * 0.25 +
              scoreData.innovation * 0.2 +
              scoreData.technical_feasibility * 0.2 +
              scoreData.user_experience * 0.15 +
              scoreData.success_metrics * 0.1 +
              scoreData.iteration * 0.1
          );
        }
        // Handle new Exponent-style field format (metrics)
        else if (
          scoreData.metrics_selection &&
          scoreData.data_analysis &&
          scoreData.statistical_understanding
        ) {
          // Use weighted average as specified in the metrics rubric
          totalScore = Math.round(
            scoreData.metrics_selection * 0.2 +
              scoreData.data_analysis * 0.25 +
              scoreData.statistical_understanding * 0.15 +
              scoreData.ab_testing * 0.15 +
              scoreData.actionable_insights * 0.15 +
              scoreData.business_impact * 0.1
          );
        }
        // Handle root cause analysis format
        else if (
          scoreData.problem_identification &&
          scoreData.analysis_depth &&
          scoreData.data_driven_approach
        ) {
          // Simple average for root cause analysis
          totalScore = Math.round(
            (scoreData.problem_identification +
              scoreData.analysis_depth +
              scoreData.data_driven_approach +
              scoreData.solution_prioritization +
              scoreData.implementation_planning +
              scoreData.risk_assessment) /
              6
          );
        }
        // Handle product improvement format
        else if (
          scoreData.user_research_foundation &&
          scoreData.improvement_prioritization &&
          scoreData.solution_innovation
        ) {
          // Simple average for product improvement
          totalScore = Math.round(
            (scoreData.user_research_foundation +
              scoreData.improvement_prioritization +
              scoreData.solution_innovation +
              scoreData.implementation_planning +
              scoreData.metrics_definition +
              scoreData.iteration_strategy) /
              6
          );
        }
        // Handle product strategy format
        else if (
          scoreData.market_analysis &&
          scoreData.competitive_positioning &&
          scoreData.strategic_thinking
        ) {
          // Simple average for product strategy
          totalScore = Math.round(
            (scoreData.market_analysis +
              scoreData.competitive_positioning +
              scoreData.strategic_thinking +
              scoreData.resource_allocation +
              scoreData.risk_assessment +
              scoreData.execution_planning) /
              6
          );
        }
        // Handle guesstimates format
        else if (
          scoreData.estimation_framework &&
          scoreData.data_reasoning &&
          scoreData.assumption_validation
        ) {
          // Simple average for guesstimates
          totalScore = Math.round(
            (scoreData.estimation_framework +
              scoreData.data_reasoning +
              scoreData.assumption_validation +
              scoreData.calculation_accuracy +
              scoreData.sensitivity_analysis +
              scoreData.business_application) /
              6
          );
        }
        // Fallback: calculate average of all numeric fields (excluding overall_score)
        else {
          const scoringFields = Object.keys(scoreData).filter(
            key => typeof scoreData[key] === 'number' && key !== 'overall_score'
          );
          if (scoringFields.length > 0) {
            const sum = scoringFields.reduce((acc, field) => acc + scoreData[field], 0);
            totalScore = Math.round(sum / scoringFields.length);
          } else {
            totalScore = 0;
          }
        }
      }

      // Format feedback based on response format
      let feedbackString;

      if (scoreData.summary && scoreData.gaps && scoreData.improved_framework) {
        // New 5-part format
        const summarySection = scoreData.summary ? '📝 SUMMARY:\n' + scoreData.summary : '';

        const strengthsSection = Array.isArray(scoreData.strengths)
          ? '\n\n✅ STRENGTHS:\n' + scoreData.strengths.map(s => `• ${s}`).join('\n')
          : '';

        const gapsSection = Array.isArray(scoreData.gaps)
          ? "\n\n⚠️ GAPS / WHAT'S MISSING:\n" + scoreData.gaps.map(g => `• ${g}`).join('\n')
          : '';

        const frameworkSection = scoreData.improved_framework
          ? '\n\n💡 IMPROVED FRAMEWORK:\n' + scoreData.improved_framework
          : '';

        feedbackString = summarySection + strengthsSection + gapsSection + frameworkSection;
      } else if (scoreData.strengths && scoreData.weaknesses) {
        // Previous enhanced format with strengths/weaknesses/brutal_truth
        const strengthsSection = Array.isArray(scoreData.strengths)
          ? '✅ STRENGTHS:\n' + scoreData.strengths.map(s => `• ${s}`).join('\n')
          : '';

        const weaknessesSection = Array.isArray(scoreData.weaknesses)
          ? '\n\n❌ WEAKNESSES:\n' + scoreData.weaknesses.map(w => `• ${w}`).join('\n')
          : '';

        const brutalTruthSection = scoreData.brutal_truth
          ? '\n\n⚡ BRUTAL TRUTH:\n' + scoreData.brutal_truth
          : '';

        const passLevelSection = scoreData.pass_level_answer
          ? '\n\n🚀 PASS-LEVEL ANSWER:\n' + scoreData.pass_level_answer
          : '';

        feedbackString =
          strengthsSection + weaknessesSection + brutalTruthSection + passLevelSection;
      } else if (Array.isArray(scoreData.feedback)) {
        // Old format with simple feedback array
        feedbackString = scoreData.feedback
          .map((bullet, index) => `${index + 1}. ${bullet}`)
          .join('\n');
      } else {
        // Fallback to raw feedback
        feedbackString = scoreData.feedback || 'No feedback provided';
      }

      // Save to database (mapping field names to existing schema)
      const score = await prisma.score.create({
        data: {
          sessionId: session.id,
          // Map old field format
          structure:
            scoreData.structure || scoreData.user_centricity || scoreData.data_analysis || 0,
          metrics:
            scoreData.metrics || scoreData.success_metrics || scoreData.metrics_selection || 0,
          prioritization:
            scoreData.prioritization || scoreData.innovation || scoreData.actionable_insights || 0,
          userEmpathy:
            scoreData.user_empathy || scoreData.user_experience || scoreData.business_impact || 0,
          communication:
            scoreData.communication ||
            scoreData.technical_feasibility ||
            scoreData.statistical_understanding ||
            0,
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
