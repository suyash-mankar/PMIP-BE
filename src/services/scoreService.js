const { prisma } = require('../config/database');
const {
  callOpenAIForScoring,
  callOpenAIForSummarisedScoring,
  parseAndValidateScore,
  RCA_SCORING_PROMPT_TEMPLATE,
  GUESSTIMATE_SCORING_PROMPT_TEMPLATE,
} = require('./openaiService');
const { getCategoryScoringPrompt } = require('./categoryScoringService');
const { calculateWeightedScore } = require('../utils/scoringUtils');
const { fetchRagContext, wrapPromptWithContext } = require('./ragContext');

const MAX_RETRIES = 2;
const USE_RAG = process.env.USE_RAG !== 'false'; // Enable RAG by default

/**
 * Score an answer using OpenAI with retry logic
 * @param {Object} answer - Answer object with question included
 * @param {Array} conversationHistory - Optional conversation history for RCA questions
 * @returns {Promise<Object>} Score object
 */
async function scoreSession(answer, conversationHistory = []) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      // Detect if this is an RCA question
      const categoryLower = answer.question.category?.toLowerCase() || '';
      const isRCAQuestion =
        categoryLower === 'rca' ||
        categoryLower.includes('root cause') ||
        categoryLower.includes('rca');

      // Detect if this is a Guesstimate question
      const isGuesstiMate =
        categoryLower.includes('guesstimate') ||
        categoryLower.includes('market sizing') ||
        categoryLower.includes('estimation') ||
        categoryLower === 'quantitative';

      let scoringPrompt;

      // Use RCA-specific prompt for RCA questions with conversation history
      if (isRCAQuestion && conversationHistory && conversationHistory.length > 0) {
        scoringPrompt = RCA_SCORING_PROMPT_TEMPLATE(
          answer.question.text,
          answer.answerText,
          conversationHistory
        );
      } else if (isGuesstiMate && conversationHistory && conversationHistory.length > 0) {
        // Use Guesstimate-specific prompt for Guesstimate questions with conversation history
        scoringPrompt = GUESSTIMATE_SCORING_PROMPT_TEMPLATE(
          answer.question.text,
          answer.answerText,
          conversationHistory
        );
      } else {
        // Get category-specific scoring prompt for other questions
        scoringPrompt = getCategoryScoringPrompt(
          answer.question.text,
          answer.answerText,
          answer.question.category
        );
      }

      // Inject RAG context if enabled
      if (USE_RAG) {
        try {
          const ragContext = await fetchRagContext({
            question: answer.question.text,
            questionId: answer.question.id,
            category: answer.question.category,
            k: 4,
          });

          if (ragContext) {
            scoringPrompt = wrapPromptWithContext(scoringPrompt, ragContext);
            console.log('✓ RAG context injected into scoring prompt');
          }
        } catch (ragError) {
          console.warn('RAG context fetch failed, continuing without:', ragError.message);
          // Continue without RAG - graceful degradation
        }
      }

      // Call OpenAI with appropriate prompt (now with optional RAG context)
      const { content, tokensUsed } = await callOpenAIForScoring(
        answer.question.text,
        answer.answerText,
        scoringPrompt
      );

      // Parse and validate
      const scoreData = parseAndValidateScore(content);

      // Store original dimension scores from AI (for RCA questions)
      const originalDimensionScores = scoreData.dimension_scores || {};

      // Extract dimension scores from the response (ALWAYS required now)
      let extractedScores = {
        structure: 0,
        metrics: 0,
        prioritization: 0,
        userEmpathy: 0,
        communication: 0,
      };

      if (scoreData.dimension_scores && typeof scoreData.dimension_scores === 'object') {
        // New format with nested dimension_scores
        const dims = scoreData.dimension_scores;

        // Extract scores (handle both nested {score: X} format and direct number format)
        // Also handle category-specific dimension names including RCA and Guesstimate dimensions
        extractedScores.structure =
          dims.structure?.score ||
          dims.structure ||
          dims.user_research?.score ||
          dims.problem_framing?.score ||
          dims.goal_clarity?.score ||
          dims.framework_selection?.score ||
          dims.market_analysis?.score ||
          dims.problem_definition?.score || // RCA: problem definition
          dims.clarification_scoping?.score || // Guesstimate: clarification & scoping
          dims.clarification_scoping ||
          0;
        extractedScores.metrics =
          dims.metrics?.score ||
          dims.metrics ||
          dims.metric_selection?.score ||
          dims.data_driven_analysis?.score || // RCA: data-driven analysis
          dims.assumptions_calculations?.score || // Guesstimate: assumptions & calculations
          dims.assumptions_calculations ||
          0;
        extractedScores.prioritization =
          dims.prioritization?.score ||
          dims.prioritization ||
          dims.solution_prioritization?.score ||
          dims.solution_ideation?.score ||
          dims.structured_breakdown?.score || // Guesstimate: structured breakdown
          dims.structured_breakdown ||
          dims.investigation_methodology?.score || // RCA: investigation methodology
          0;
        extractedScores.userEmpathy =
          dims.user_empathy?.score ||
          dims.user_empathy ||
          dims.pain_point_identification?.score ||
          dims.root_cause_identification?.score || // RCA: root cause identification
          dims.mathematical_logic?.score || // Guesstimate: mathematical logic
          dims.mathematical_logic ||
          0;
        extractedScores.communication =
          dims.communication?.score ||
          dims.communication ||
          dims.execution?.score ||
          dims.calculation_logic?.score ||
          dims.solution_quality?.score || // RCA: solution quality
          dims.sanity_check?.score || // Guesstimate: sanity check
          dims.sanity_check ||
          0;

        console.log('✅ Extracted dimension scores:', extractedScores);
        console.log('✅ Original dimension scores from AI:', originalDimensionScores);
      } else {
        console.warn('⚠️  AI response missing dimension_scores object - will use fallback scoring');
        console.warn('⚠️  Response keys:', Object.keys(scoreData));
      }

      // Calculate overall score using weighted average from individual parameters
      let totalScore = calculateWeightedScore(extractedScores);

      // If weighted score is 0 (no dimension scores provided), fall back to old calculation methods
      if (!totalScore) {
        // Try to use AI's overall_score if provided
        totalScore = scoreData.overall_score;

        // If we have an overall_score but no dimension scores, distribute it equally for display
        if (totalScore > 0) {
          console.warn(
            `⚠️  WARNING: Distributing overall_score (${totalScore}) equally to all parameters!`
          );
          console.warn(
            '⚠️  This means all parameter scores will be the same (all ' + totalScore + '/10)'
          );
          console.warn(
            '⚠️  The AI should provide individual dimension_scores for accurate scoring.'
          );
          extractedScores = {
            structure: totalScore,
            metrics: totalScore,
            prioritization: totalScore,
            userEmpathy: totalScore,
            communication: totalScore,
          };
        }
      }

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
      let summaryFeedback = '';

      if (scoreData.detailed_feedback) {
        // New format with summary and detailed feedback
        feedbackString = scoreData.detailed_feedback;
        summaryFeedback = scoreData.summary_feedback || '';
      } else if (scoreData.feedback_text) {
        // New interviewer-style format - use the formatted feedback_text directly
        feedbackString = scoreData.feedback_text;
      } else if (scoreData.strengths && scoreData.gaps) {
        // Fallback: Format from strengths and gaps arrays
        const strengthsSection = Array.isArray(scoreData.strengths)
          ? '## YOUR STRENGTHS\n\n' + scoreData.strengths.map(s => `- ${s}`).join('\n')
          : '';

        const gapsSection = Array.isArray(scoreData.gaps)
          ? '\n\n## CRITICAL GAPS TO ADDRESS\n\n' + scoreData.gaps.map(g => `- ${g}`).join('\n')
          : '';

        const bottomLine = scoreData.brutal_truth
          ? '\n\n## BOTTOM LINE\n\n' + scoreData.brutal_truth
          : '';

        feedbackString = strengthsSection + gapsSection + bottomLine;
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
        // Fallback to raw feedback - check multiple field names
        feedbackString =
          scoreData.summary_feedback ||
          scoreData.detailed_feedback ||
          scoreData.feedback ||
          scoreData.feedback_text ||
          'No feedback provided';
      }

      // Check if there's an existing summary score to update
      const existingScore = await prisma.score.findUnique({
        where: { answerId: answer.id },
      });

      let score;
      if (existingScore && existingScore.status === 'completed_summary') {
        // Update existing summary score with detailed feedback
        score = await prisma.score.update({
          where: { answerId: answer.id },
          data: {
            structure: extractedScores.structure,
            metrics: extractedScores.metrics,
            prioritization: extractedScores.prioritization,
            userEmpathy: extractedScores.userEmpathy,
            communication: extractedScores.communication,
            // Store both summary and detailed feedback in a structured format
            feedback: summaryFeedback
              ? `SUMMARY: ${summaryFeedback}\n\n---\n\nDETAILED:\n${feedbackString}`
              : feedbackString,
            sampleAnswer: scoreData.reframed_answer || '',
            totalScore,
            tokensUsed: existingScore.tokensUsed + tokensUsed, // Add tokens from both calls
            status: 'completed', // Mark as fully completed
          },
        });
      } else {
        // Create new score (no existing summary)
        score = await prisma.score.upsert({
          where: { answerId: answer.id },
          create: {
            answerId: answer.id,
            structure: extractedScores.structure,
            metrics: extractedScores.metrics,
            prioritization: extractedScores.prioritization,
            userEmpathy: extractedScores.userEmpathy,
            communication: extractedScores.communication,
            // Store both summary and detailed feedback in a structured format
            feedback: summaryFeedback
              ? `SUMMARY: ${summaryFeedback}\n\n---\n\nDETAILED:\n${feedbackString}`
              : feedbackString,
            sampleAnswer: scoreData.reframed_answer || '',
            totalScore,
            tokensUsed,
            status: 'completed',
          },
          update: {
            structure: extractedScores.structure,
            metrics: extractedScores.metrics,
            prioritization: extractedScores.prioritization,
            userEmpathy: extractedScores.userEmpathy,
            communication: extractedScores.communication,
            feedback: summaryFeedback
              ? `SUMMARY: ${summaryFeedback}\n\n---\n\nDETAILED:\n${feedbackString}`
              : feedbackString,
            sampleAnswer: scoreData.reframed_answer || '',
            totalScore,
            tokensUsed,
            status: 'completed',
          },
        });
      }

      // Update answer status
      await prisma.answer.update({
        where: { id: answer.id },
        data: { status: 'scored' },
      });

      // Log event
      await prisma.event.create({
        data: {
          userId: answer.userId,
          answerId: answer.id,
          eventType: 'openai_call',
          metadata: JSON.stringify({
            attempt: attempt + 1,
            success: true,
            totalScore,
          }),
          tokensUsed,
        },
      });

      // Add original dimension scores to response (for RCA questions with specific dimension names)
      const scoreWithOriginalDimensions = {
        ...score,
        // Include original AI dimension scores if they exist (for RCA: problem_definition, etc.)
        ...(Object.keys(originalDimensionScores).length > 0 && {
          rcaDimensions: originalDimensionScores,
        }),
      };

      return scoreWithOriginalDimensions;
    } catch (error) {
      lastError = error;
      attempt++;
      console.error(`Scoring attempt ${attempt} failed:`, error.message);

      // Log failed attempt
      await prisma.event.create({
        data: {
          userId: answer.userId,
          answerId: answer.id,
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

  // All retries failed - flag answer for review
  console.error(`All scoring attempts failed for answer ${answer.id}`);

  const score = await prisma.score.upsert({
    where: { answerId: answer.id },
    create: {
      answerId: answer.id,
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      feedback: 'Automated scoring failed. This answer has been flagged for manual review.',
      sampleAnswer: '',
      totalScore: 0,
      tokensUsed: 0,
      status: 'needs_review',
    },
    update: {
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      feedback: 'Automated scoring failed. This answer has been flagged for manual review.',
      sampleAnswer: '',
      totalScore: 0,
      tokensUsed: 0,
      status: 'needs_review',
    },
  });

  await prisma.answer.update({
    where: { id: answer.id },
    data: { status: 'needs_review' },
  });

  throw new Error(`Scoring failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
}

/**
 * Score an answer using OpenAI with summarised feedback (faster)
 * @param {Object} answer - Answer object with question included
 * @param {Array} conversationHistory - Optional conversation history for RCA questions
 * @returns {Promise<Object>} Score object with summarised feedback
 */
async function scoreSessionSummarised(answer, conversationHistory = []) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      // Detect if this is an RCA question
      const isRCAQuestion =
        answer.question.category === 'RCA' ||
        answer.question.category?.toLowerCase().includes('root cause') ||
        answer.question.category?.toLowerCase().includes('rca');

      let scoringPrompt;

      // Use RCA-specific prompt for RCA questions with conversation history
      if (isRCAQuestion && conversationHistory && conversationHistory.length > 0) {
        scoringPrompt = RCA_SCORING_PROMPT_TEMPLATE(
          answer.question.text,
          answer.answerText,
          conversationHistory
        );
      } else {
        // Get category-specific scoring prompt for non-RCA questions
        scoringPrompt = getCategoryScoringPrompt(
          answer.question.text,
          answer.answerText,
          answer.question.category
        );
      }

      // Call OpenAI with appropriate prompt using summarised scoring
      const { content, tokensUsed } = await callOpenAIForSummarisedScoring(
        answer.question.text,
        answer.answerText,
        scoringPrompt
      );

      // Parse and validate
      const scoreData = parseAndValidateScore(content);

      // Store original dimension scores from AI (for RCA questions)
      const originalDimensionScores = scoreData.dimension_scores || {};

      // Debug: Log feedback fields
      console.log('📝 Summarised feedback fields in scoreData:', {
        has_summary_feedback: !!scoreData.summary_feedback,
        has_detailed_feedback: !!scoreData.detailed_feedback,
        has_feedback: !!scoreData.feedback,
        has_feedback_text: !!scoreData.feedback_text,
        summary_feedback_preview: scoreData.summary_feedback?.substring(0, 100) || 'N/A',
      });

      // Extract dimension scores from the response (ALWAYS required now)
      let extractedScores = {
        structure: 0,
        metrics: 0,
        prioritization: 0,
        userEmpathy: 0,
        communication: 0,
      };

      if (scoreData.dimension_scores && typeof scoreData.dimension_scores === 'object') {
        // New format with nested dimension_scores
        const dims = scoreData.dimension_scores;

        // Extract scores (handle both nested {score: X} format and direct number format)
        // Also handle category-specific dimension names including RCA and Guesstimate dimensions
        extractedScores.structure =
          dims.structure?.score ||
          dims.structure ||
          dims.user_research?.score ||
          dims.problem_framing?.score ||
          dims.goal_clarity?.score ||
          dims.framework_selection?.score ||
          dims.market_analysis?.score ||
          dims.problem_definition?.score || // RCA: problem definition
          dims.clarification_scoping?.score || // Guesstimate: clarification & scoping
          dims.clarification_scoping ||
          0;
        extractedScores.metrics =
          dims.metrics?.score ||
          dims.metrics ||
          dims.metric_selection?.score ||
          dims.data_driven_analysis?.score || // RCA: data-driven analysis
          dims.assumptions_calculations?.score || // Guesstimate: assumptions & calculations
          dims.assumptions_calculations ||
          0;
        extractedScores.prioritization =
          dims.prioritization?.score ||
          dims.prioritization ||
          dims.solution_prioritization?.score ||
          dims.solution_ideation?.score ||
          dims.structured_breakdown?.score || // Guesstimate: structured breakdown
          dims.structured_breakdown ||
          dims.investigation_methodology?.score || // RCA: investigation methodology
          0;
        extractedScores.userEmpathy =
          dims.user_empathy?.score ||
          dims.user_empathy ||
          dims.pain_point_identification?.score ||
          dims.root_cause_identification?.score || // RCA: root cause identification
          dims.mathematical_logic?.score || // Guesstimate: mathematical logic
          dims.mathematical_logic ||
          0;
        extractedScores.communication =
          dims.communication?.score ||
          dims.communication ||
          dims.execution?.score ||
          dims.calculation_logic?.score ||
          dims.solution_quality?.score || // RCA: solution quality
          dims.sanity_check?.score || // Guesstimate: sanity check
          dims.sanity_check ||
          0;

        console.log('✅ Extracted dimension scores:', extractedScores);
      } else {
        console.warn('⚠️  AI response missing dimension_scores object - will use fallback scoring');
        console.warn('⚠️  Response keys:', Object.keys(scoreData));
      }

      // Calculate overall score using weighted average from individual parameters
      let totalScore = calculateWeightedScore(extractedScores);

      // If weighted score is 0 (no dimension scores provided), fall back to old calculation methods
      if (!totalScore) {
        // Try to use AI's overall_score if provided
        totalScore = scoreData.overall_score;

        // If we have an overall_score but no dimension scores, distribute it equally for display
        if (totalScore > 0) {
          console.warn(
            `⚠️  WARNING: Distributing overall_score (${totalScore}) equally to all parameters!`
          );
          console.warn(
            '⚠️  This means all parameter scores will be the same (all ' + totalScore + '/10)'
          );
          console.warn(
            '⚠️  The AI should provide individual dimension_scores for accurate scoring.'
          );
          extractedScores = {
            structure: totalScore,
            metrics: totalScore,
            prioritization: totalScore,
            userEmpathy: totalScore,
            communication: totalScore,
          };
        }
      }

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
        // Handle new Exponent-style field format (design)
        else if (scoreData.user_centricity && scoreData.creativity && scoreData.feasibility) {
          // Use weighted average as specified in the design rubric
          totalScore = Math.round(
            scoreData.user_centricity * 0.25 +
              scoreData.creativity * 0.2 +
              scoreData.feasibility * 0.15 +
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
              scoreData.calculation_accuracy * 0.15 +
              scoreData.business_impact * 0.1
          );
        }
        // Handle new Exponent-style field format (strategy)
        else if (
          scoreData.market_analysis &&
          scoreData.framework_selection &&
          scoreData.strategic_thinking
        ) {
          // Simple average for strategy
          totalScore = Math.round(
            (scoreData.market_analysis +
              scoreData.framework_selection +
              scoreData.strategic_thinking +
              scoreData.data_driven_approach +
              scoreData.solution_prioritization +
              scoreData.implementation_planning +
              scoreData.risk_assessment) /
              6
          );
        }
        // Handle new Exponent-style field format (product improvement)
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
        } else {
          // Fallback: calculate from any available numeric fields
          const numericFields = Object.entries(scoreData)
            .filter(([key, val]) => typeof val === 'number' && val >= 0 && val <= 10)
            .map(([_, val]) => val);

          if (numericFields.length > 0) {
            totalScore = Math.round(
              numericFields.reduce((sum, val) => sum + val, 0) / numericFields.length
            );
          } else {
            // Last resort: if no valid fields, set to 0
            console.warn('No valid score fields found in AI response');
            totalScore = 0;
          }
        }
      }

      // Format feedback based on response format
      let feedbackString;

      if (scoreData.detailed_feedback) {
        // New format with summary and detailed feedback
        feedbackString = scoreData.detailed_feedback;
      } else if (scoreData.feedback_text) {
        // New interviewer-style format - use the formatted feedback_text directly
        feedbackString = scoreData.feedback_text;
      } else if (scoreData.strengths && scoreData.gaps) {
        // Fallback: Format from strengths and gaps arrays
        const strengthsSection = Array.isArray(scoreData.strengths)
          ? '## YOUR STRENGTHS\n\n' + scoreData.strengths.map(s => `- ${s}`).join('\n')
          : '';

        const gapsSection = Array.isArray(scoreData.gaps)
          ? '\n\n## CRITICAL GAPS TO ADDRESS\n\n' + scoreData.gaps.map(g => `- ${g}`).join('\n')
          : '';

        const bottomLine = scoreData.brutal_truth
          ? '\n\n## BOTTOM LINE\n\n' + scoreData.brutal_truth
          : '';

        feedbackString = strengthsSection + gapsSection + bottomLine;
      } else if (scoreData.strengths && scoreData.weaknesses) {
        // Previous enhanced format with strengths/weaknesses/brutal_truth
        const strengthsSection = Array.isArray(scoreData.strengths)
          ? '✅ STRENGTHS:\n' + scoreData.strengths.map(s => `• ${s}`).join('\n')
          : '';

        const weaknessesSection = Array.isArray(scoreData.weaknesses)
          ? '\n\n❌ WEAKNESSES:\n' + scoreData.weaknesses.map(w => `• ${w}`).join('\n')
          : '';

        const brutalTruthSection = scoreData.brutal_truth
          ? '\n\n💡 BRUTAL TRUTH:\n' + scoreData.brutal_truth
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
        // Fallback to raw feedback - check multiple field names
        feedbackString =
          scoreData.summary_feedback ||
          scoreData.detailed_feedback ||
          scoreData.feedback ||
          scoreData.feedback_text ||
          'No feedback provided';
      }

      // Save to database (marking as summarised score)
      const score = await prisma.score.upsert({
        where: { answerId: answer.id },
        create: {
          answerId: answer.id,
          structure: extractedScores.structure,
          metrics: extractedScores.metrics,
          prioritization: extractedScores.prioritization,
          userEmpathy: extractedScores.userEmpathy,
          communication: extractedScores.communication,
          feedback: feedbackString,
          sampleAnswer: scoreData.reframed_answer || '',
          totalScore,
          tokensUsed,
          status: 'completed_summary', // Mark as summarised score
        },
        update: {
          structure: extractedScores.structure,
          metrics: extractedScores.metrics,
          prioritization: extractedScores.prioritization,
          userEmpathy: extractedScores.userEmpathy,
          communication: extractedScores.communication,
          feedback: feedbackString,
          sampleAnswer: scoreData.reframed_answer || '',
          totalScore,
          tokensUsed,
          status: 'completed_summary',
        },
      });

      // Update answer status
      await prisma.answer.update({
        where: { id: answer.id },
        data: { status: 'scored' },
      });

      // Log event
      await prisma.event.create({
        data: {
          userId: answer.userId,
          answerId: answer.id,
          eventType: 'answer_scored_summarised',
          metadata: JSON.stringify({
            totalScore,
            tokensUsed,
          }),
        },
      });

      // Add original dimension scores to response (for RCA questions with specific dimension names)
      const scoreWithOriginalDimensions = {
        ...score,
        // Include original AI dimension scores if they exist (for RCA: problem_definition, etc.)
        ...(Object.keys(originalDimensionScores).length > 0 && {
          rcaDimensions: originalDimensionScores,
        }),
      };

      return scoreWithOriginalDimensions;
    } catch (error) {
      attempt++;
      lastError = error;
      console.error(`Summarised scoring attempt ${attempt} failed:`, error.message);

      if (attempt <= MAX_RETRIES) {
        console.log(`Retrying summarised scoring (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
      }
    }
  }

  // All retries failed - create placeholder score
  const score = await prisma.score.upsert({
    where: { answerId: answer.id },
    create: {
      answerId: answer.id,
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      feedback: 'Automated scoring failed. This answer has been flagged for manual review.',
      sampleAnswer: '',
      totalScore: 0,
      tokensUsed: 0,
      status: 'needs_review',
    },
    update: {
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      feedback: 'Automated scoring failed. This answer has been flagged for manual review.',
      sampleAnswer: '',
      totalScore: 0,
      tokensUsed: 0,
      status: 'needs_review',
    },
  });

  await prisma.answer.update({
    where: { id: answer.id },
    data: { status: 'needs_review' },
  });

  throw new Error(
    `Summarised scoring failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`
  );
}

module.exports = { scoreSession, scoreSessionSummarised };
