const { safeQuery, prisma } = require('../utils/dbHelper');
const { scoreSession, scoreSessionSummarised } = require('../services/scoreService');
const {
  callOpenAIForClarification,
  callOpenAIForRCAClarification,
  callOpenAIForGuesstimate,
  generateModelAnswer,
  generateRCAModelAnswer,
  generateGuesstiMateModelAnswer,
} = require('../services/openaiService');
const { fetchRagContext } = require('../services/ragContext');
const { buildEvaluatorAgent } = require('../agents/subagents/evaluator');
const { buildInterviewerAgent } = require('../agents/subagents/interviewer');

// Environment flag to toggle agent usage
const USE_AGENTS = process.env.USE_AGENTS === 'true';

const startInterview = async (req, res, next) => {
  try {
    const { category } = req.body;
    const userId = req.user?.id; // Use optional chaining for anonymous users

    let viewedQuestionIds = [];

    // Only track viewed questions for authenticated users
    if (userId) {
      const viewedQuestions = await safeQuery(
        db =>
          db.questionView.findMany({
            where: { userId },
            select: { questionId: true },
          }),
        [],
        'Fetch viewed questions'
      );
      viewedQuestionIds = viewedQuestions.map(v => v.questionId);
    }

    // Build query conditions
    const whereClause = {};
    if (viewedQuestionIds.length > 0) {
      whereClause.id = {
        notIn: viewedQuestionIds, // Exclude already viewed questions
      };
    }
    if (category) whereClause.category = category;

    // PRIORITY 1: Try to get questions from "theproductfolks" source first
    let questions = await safeQuery(
      db =>
        db.question.findMany({
          where: {
            ...whereClause,
            source: 'theproductfolks',
          },
        }),
      [],
      'Fetch Product Folks questions'
    );

    // PRIORITY 2: If no Product Folks questions available, get from other sources
    if (questions.length === 0) {
      console.log('✓ All Product Folks questions shown, moving to other sources');
      questions = await safeQuery(
        db =>
          db.question.findMany({
            where: {
              ...whereClause,
              source: { not: 'theproductfolks' }, // Exclude Product Folks
            },
          }),
        [],
        'Fetch questions from other sources'
      );
    } else {
      console.log(`✓ Found ${questions.length} unviewed Product Folks questions`);
    }

    // Fallback: If DB failed and no questions returned, use sample question
    if (questions.length === 0) {
      console.warn('⚠️ No questions from database, using fallback question');
      const fallbackQuestion = {
        id: 9999,
        text: 'Design a product to help remote teams collaborate more effectively',
        category: category || 'Product Design',
        company: ['Meta', 'Google'],
        source: 'fallback',
        tags: [],
      };
      return res.json(fallbackQuestion);
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    // Record that user has viewed this question (only for authenticated users)
    if (userId) {
      await safeQuery(
        db =>
          db.questionView.upsert({
            where: {
              userId_questionId: {
                userId,
                questionId: question.id,
              },
            },
            create: {
              userId,
              questionId: question.id,
            },
            update: {
              viewedAt: new Date(),
            },
          }),
        null,
        'Record question view'
      );

      // Log event (only for authenticated users)
      await safeQuery(
        db =>
          db.event.create({
            data: {
              userId,
              eventType: 'question_fetched',
              metadata: JSON.stringify({
                questionId: question.id,
                category: question.category,
                source: question.source,
              }),
            },
          }),
        null,
        'Log question fetch event'
      );
    }

    res.json({
      id: question.id,
      text: question.text,
      category: question.category,
      company: question.company ? JSON.parse(question.company) : [],
      source: question.source,
      tags: question.tags ? JSON.parse(question.tags) : [],
    });
  } catch (error) {
    next(error);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const { questionId, answerText, answerId, practiceSessionId, timeTaken } = req.body;
    const userId = req.user?.id; // Use optional chaining for anonymous users

    // If answerId provided, update existing answer
    if (answerId) {
      const answer = await prisma.answer.update({
        where: { id: answerId },
        data: {
          answerText,
          timeTaken,
        },
      });
      return res.json({ answerId: answer.id, message: 'Answer updated' });
    }

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // For authenticated users, verify practice session
    if (userId && practiceSessionId) {
      const practiceSession = await prisma.practiceSession.findUnique({
        where: { id: practiceSessionId },
      });

      if (!practiceSession || practiceSession.userId !== userId) {
        return res.status(404).json({ error: 'Practice session not found' });
      }
    }

    // Create answer (with or without userId for anonymous)
    const answerData = {
      questionId,
      answerText,
      timeTaken,
      status: 'submitted',
    };

    if (userId) {
      answerData.userId = userId;
    }

    if (practiceSessionId) {
      answerData.practiceSessionId = practiceSessionId;
    }

    const answer = await prisma.answer.create({
      data: answerData,
    });

    // Log event (only for authenticated users)
    if (userId) {
      await prisma.event.create({
        data: {
          userId,
          answerId: answer.id,
          eventType: 'answer_submitted',
          metadata: JSON.stringify({ questionId, practiceSessionId, timeTaken }),
        },
      });
    }

    res.status(201).json({
      answerId: answer.id,
      message: 'Answer submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const score = async (req, res, next) => {
  try {
    const { answerId, conversationHistory } = req.body;
    const userId = req.user?.id;

    // Fetch answer with question
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: true },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Verify ownership (only for authenticated users)
    if (userId && answer.userId && answer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already scored
    const existingScore = await prisma.score.findUnique({
      where: { answerId },
    });

    // If existing score is a summary, update it with detailed feedback
    if (existingScore && existingScore.status === 'completed_summary') {
      console.log('Updating summary score with detailed feedback...');

      // Score the answer using OpenAI for detailed feedback (pass conversation history for RCA)
      const scoreResult = await scoreSession(answer, conversationHistory);

      return res.json({
        message: 'Answer scored successfully with detailed feedback',
        score: scoreResult,
      });
    }

    // If already scored with detailed feedback, return it
    if (existingScore) {
      return res.json({
        message: 'Answer already scored',
        score: existingScore,
      });
    }

    // Use Evaluator Agent if enabled, otherwise fallback to direct scoring
    if (USE_AGENTS) {
      try {
        console.log('🤖 Using Evaluator Agent for scoring...');
        const evaluator = await buildEvaluatorAgent();

        const agentInput = `Use the score_answer tool to score this PM interview answer.

Call the score_answer tool with these exact parameters:
- question: "${answer.question.text.replace(/"/g, '\\"')}"
- answer: "${answer.answerText.replace(/"/g, '\\"')}"
- category: "${answer.question.category || 'General'}"
- questionId: ${answer.questionId}
${conversationHistory && conversationHistory.length > 0
  ? `- conversationHistory: ${JSON.stringify(conversationHistory)}`
  : ''}

IMPORTANT: Pass the FULL answer text (not truncated). The answer is ${answer.answerText.length} characters long.

Return the tool's output JSON directly without any modification.`;

        const agentResult = await evaluator.invoke(
          agentInput, // LangChain v1.0 expects string or { messages: [...] }
          { userId }
        );

        // The evaluator agent should call score_answer tool which returns JSON
        // Extract score data from agent output or tool results
        let scoreData;

        console.log('🔍 Agent result structure:', {
          hasOutput: !!agentResult.output,
          outputType: typeof agentResult.output,
          outputLength: typeof agentResult.output === 'string' ? agentResult.output.length : 0,
          outputPreview: typeof agentResult.output === 'string' ? agentResult.output.substring(0, 500) : 'N/A',
          intermediateStepsCount: agentResult.intermediateSteps?.length || 0,
        });
        
        // Log full agent output for debugging (first 2000 chars)
        if (agentResult.output) {
          console.log('🔍 Full agent output (first 2000 chars):', 
            typeof agentResult.output === 'string' 
              ? agentResult.output.substring(0, 2000) 
              : JSON.stringify(agentResult.output, null, 2).substring(0, 2000)
          );
        }

        // First, try to find score_answer tool result in intermediate steps
        const toolResults = agentResult.intermediateSteps || [];
        console.log('🔍 Intermediate steps count:', toolResults.length);
        if (toolResults.length > 0) {
          console.log('🔍 Intermediate steps structure:', JSON.stringify(toolResults, null, 2).substring(0, 1000));
        } else {
          console.log('⚠️ No intermediate steps found - checking if tool output is in agent message');
        }

        const scoreToolResult = toolResults.find(step => {
          const toolName = step.action?.tool || step.action?.tool_name;
          console.log(`  Checking step with tool: ${toolName}`);
          return toolName === 'score_answer';
        });
        
        if (scoreToolResult) {
          console.log('✅ Found score_answer tool result in intermediate steps');
        } else {
          console.log('⚠️ score_answer tool result NOT found in intermediate steps');
        }

        if (scoreToolResult && scoreToolResult.observation) {
          console.log('🔍 Found score_answer tool result:', {
            observationType: typeof scoreToolResult.observation,
            observationPreview: String(scoreToolResult.observation).substring(0, 500),
          });

          try {
            // Parse the observation (should be JSON string from score_answer tool)
            const observationStr =
              typeof scoreToolResult.observation === 'string'
                ? scoreToolResult.observation
                : JSON.stringify(scoreToolResult.observation);

            const toolOutput = JSON.parse(observationStr);
            console.log('🔍 Parsed tool output structure:', {
              hasSuccess: !!toolOutput.success,
              hasScores: !!toolOutput.scores,
              scoreKeys: toolOutput.scores ? Object.keys(toolOutput.scores) : [],
              hasDetailedFeedback: !!(toolOutput.scores?.detailed_feedback),
              detailedFeedbackLength: toolOutput.scores?.detailed_feedback?.length || 0,
              detailedFeedbackPreview: toolOutput.scores?.detailed_feedback?.substring(0, 500) || 'N/A',
              hasSummaryFeedback: !!(toolOutput.scores?.summary_feedback),
              hasStrengths: Array.isArray(toolOutput.scores?.strengths),
              hasGaps: Array.isArray(toolOutput.scores?.gaps),
            });

            if (toolOutput.success && toolOutput.scores) {
              scoreData = toolOutput.scores;
              console.log('✅ Using tool output scores directly');
            } else if (toolOutput.scores) {
              scoreData = toolOutput.scores;
              console.log('✅ Using tool output scores (no success flag)');
            } else if (toolOutput.overall_score) {
              // Tool might have returned scores directly
              scoreData = toolOutput;
              console.log('✅ Using tool output directly (has overall_score)');
            } else {
              console.warn('⚠️ Tool output structure unexpected:', Object.keys(toolOutput));
            }
          } catch (parseErr) {
            console.warn('⚠️ Failed to parse tool observation:', parseErr.message);
            // Tool output might already be the score object
            if (typeof scoreToolResult.observation === 'object') {
              scoreData = scoreToolResult.observation;
              console.log('✅ Using tool observation as object directly');
            }
          }
        }

        // If not found in tool results, try parsing agent output
        if (!scoreData) {
          console.log('🔍 Trying to parse agent output...');
          const outputStr = agentResult.output;
          
          console.log('🔍 Agent output type:', typeof outputStr);
          console.log('🔍 Agent output preview:', typeof outputStr === 'string' ? outputStr.substring(0, 1000) : JSON.stringify(outputStr, null, 2).substring(0, 1000));

          if (typeof outputStr === 'string') {
            try {
              // Try direct JSON parse
              const parsed = JSON.parse(outputStr);
              console.log('✅ Parsed agent output as JSON, keys:', Object.keys(parsed));
              
              // Check if it's the tool output format: {success: true, scores: {...}}
              if (parsed.success && parsed.scores) {
                scoreData = parsed.scores;
                console.log('✅ Extracted scores from agent output (success format)');
              } else if (parsed.scores) {
                scoreData = parsed.scores;
                console.log('✅ Extracted scores from agent output (scores format)');
              } else if (parsed.overall_score !== undefined || parsed.dimension_scores) {
                // Direct score format - has overall_score or dimension_scores
                scoreData = parsed;
                console.log('✅ Using agent output directly (has overall_score or dimension_scores)');
              } else {
                // Might be the score data itself
                scoreData = parsed;
                console.log('⚠️ Using parsed output as scoreData (no recognized format)');
              }
            } catch (parseErr) {
              console.log('⚠️ Direct JSON parse failed, trying to extract JSON from text...', parseErr.message);
              // Try extracting JSON from text if it's embedded
              const jsonMatch = outputStr.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  console.log('✅ Extracted JSON from text, keys:', Object.keys(parsed));
                  // Same extraction logic
                  if (parsed.success && parsed.scores) {
                    scoreData = parsed.scores;
                    console.log('✅ Extracted scores from embedded JSON (success format)');
                  } else if (parsed.scores) {
                    scoreData = parsed.scores;
                    console.log('✅ Extracted scores from embedded JSON (scores format)');
                  } else if (parsed.overall_score !== undefined || parsed.dimension_scores) {
                    scoreData = parsed;
                    console.log('✅ Using embedded JSON directly (has overall_score or dimension_scores)');
                  } else {
                    scoreData = parsed;
                    console.log('⚠️ Using embedded JSON as scoreData');
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to parse extracted JSON:', e.message);
                }
              } else {
                console.warn('⚠️ No JSON found in agent output string');
              }
            }
          } else if (typeof outputStr === 'object' && outputStr !== null) {
            console.log('✅ Agent output is object, keys:', Object.keys(outputStr));
            // Same extraction logic for object
            if (outputStr.success && outputStr.scores) {
              scoreData = outputStr.scores;
              console.log('✅ Extracted scores from object (success format)');
            } else if (outputStr.scores) {
              scoreData = outputStr.scores;
              console.log('✅ Extracted scores from object (scores format)');
            } else if (outputStr.overall_score !== undefined || outputStr.dimension_scores) {
              scoreData = outputStr;
              console.log('✅ Using object directly (has overall_score or dimension_scores)');
            } else {
              scoreData = outputStr;
              console.log('⚠️ Using object as scoreData');
            }
          }
        }

        // Validate and save score
        if (!scoreData) {
          console.error('❌ No score data found. Agent output:', agentResult.output);
          console.error(
            '❌ Intermediate steps:',
            JSON.stringify(agentResult.intermediateSteps, null, 2)
          );
          throw new Error('Could not extract score data from agent response');
        }

        // Check for overall_score (might be nested or direct)
        // Also check if we have dimension_scores that we can use to calculate overall_score
        const hasOverallScore = 
          scoreData.overall_score !== undefined || 
          (typeof scoreData === 'object' && 'overall_score' in scoreData);
        
        const hasDimensionScores = 
          scoreData.dimension_scores && 
          typeof scoreData.dimension_scores === 'object' &&
          Object.keys(scoreData.dimension_scores).length > 0;
        
        // If no overall_score but we have dimension_scores, calculate it
        if (!hasOverallScore && hasDimensionScores) {
          const dims = scoreData.dimension_scores;
          const scores = [
            dims.structure?.score ?? dims.structure ?? 0,
            dims.metrics?.score ?? dims.metrics ?? 0,
            dims.prioritization?.score ?? dims.prioritization ?? 0,
            dims.userEmpathy?.score ?? dims.userEmpathy ?? dims.user_empathy?.score ?? dims.user_empathy ?? 0,
            dims.communication?.score ?? dims.communication ?? 0,
          ].filter(s => typeof s === 'number' && !isNaN(s));
          
          if (scores.length > 0) {
            scoreData.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            console.log('✅ Calculated overall_score from dimension_scores:', scoreData.overall_score);
          }
        }
        
        if (!hasOverallScore && !hasDimensionScores && typeof scoreData === 'object') {
          console.error('❌ Invalid score format. Score data:', JSON.stringify(scoreData, null, 2));
          console.error('❌ Available keys:', Object.keys(scoreData));
          throw new Error('Invalid score format from agent: missing overall_score and dimension_scores');
        }

        // Log what we're receiving from the tool
        console.log('🔍 Score data structure before formatting:', {
          hasSummaryFeedback: !!scoreData.summary_feedback,
          hasDetailedFeedback: !!scoreData.detailed_feedback,
          hasFeedbackText: !!scoreData.feedback_text,
          hasStrengths: Array.isArray(scoreData.strengths),
          hasGaps: Array.isArray(scoreData.gaps),
          hasBrutalTruth: !!scoreData.brutal_truth,
          hasVerdict: !!scoreData.verdict,
          hasObservations: !!scoreData.observations,
          hasRecommendations: !!scoreData.recommendations,
          detailedFeedbackLength: scoreData.detailed_feedback?.length || 0,
          detailedFeedbackPreview: scoreData.detailed_feedback?.substring(0, 500) || 'N/A',
          allKeys: Object.keys(scoreData),
          overallScore: scoreData.overall_score,
          dimensionScores: scoreData.dimension_scores,
        });

        // Format feedback string from score data (EXACT same logic as scoreSession in scoreService.js)
        // Priority: detailed_feedback > feedback_text > strengths+gaps > summary_feedback
        let feedbackString = '';
        let summaryFeedback = '';

        if (scoreData.detailed_feedback) {
          // New format with summary and detailed feedback (preferred)
          // Use detailed_feedback directly - it's already complete markdown with all sections
          feedbackString = scoreData.detailed_feedback;
          summaryFeedback = scoreData.summary_feedback || '';
          
          // DON'T add prefixes when detailed_feedback exists - it's already complete
          // The detailed_feedback should contain all sections: ANSWER EVALUATION, STRENGTHS, GAPS, BOTTOM LINE
          console.log('✅ Using detailed_feedback directly (length:', feedbackString.length, 'chars)');
        } else if (scoreData.feedback_text) {
          // New interviewer-style format - use the formatted feedback_text directly
          feedbackString = scoreData.feedback_text;
          console.log('✅ Using feedback_text (length:', feedbackString.length, 'chars)');
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
          console.log('✅ Using strengths+gaps format (length:', feedbackString.length, 'chars)');
        } else if (scoreData.summary_feedback) {
          // Fallback to summary only
          feedbackString = scoreData.summary_feedback;
          summaryFeedback = scoreData.summary_feedback;
          console.log('⚠️ Using summary_feedback only (no detailed_feedback found)');
        } else if (scoreData.feedback) {
          // Handle feedback field (might be string or object)
          if (typeof scoreData.feedback === 'string') {
            feedbackString = scoreData.feedback;
          } else if (typeof scoreData.feedback === 'object') {
            // Convert feedback object to string
            if (scoreData.feedback.overall) {
              const parts = [];
              if (scoreData.feedback.overall) parts.push(`## Overall Feedback\n${scoreData.feedback.overall}`);
              if (scoreData.feedback.structure) parts.push(`### Structure\n${scoreData.feedback.structure}`);
              if (scoreData.feedback.metrics) parts.push(`### Metrics\n${scoreData.feedback.metrics}`);
              if (scoreData.feedback.prioritization) parts.push(`### Prioritization\n${scoreData.feedback.prioritization}`);
              if (scoreData.feedback.user_empathy) parts.push(`### User Empathy\n${scoreData.feedback.user_empathy}`);
              if (scoreData.feedback.communication) parts.push(`### Communication\n${scoreData.feedback.communication}`);
              feedbackString = parts.join('\n\n');
            } else {
              feedbackString = JSON.stringify(scoreData.feedback, null, 2);
            }
          } else {
            feedbackString = String(scoreData.feedback);
          }
          console.log('✅ Using feedback field (length:', feedbackString.length, 'chars)');
        } else if (scoreData.verdict || scoreData.observations || scoreData.recommendations) {
          // Handle format: {verdict, observations, recommendations} - convert to feedback
          const parts = [];
          if (scoreData.verdict) {
            parts.push(`## Verdict\n${scoreData.verdict}`);
          }
          if (scoreData.observations) {
            if (typeof scoreData.observations === 'string') {
              parts.push(`## Observations\n${scoreData.observations}`);
            } else if (typeof scoreData.observations === 'object') {
              // Format object observations
              const obsParts = [];
              for (const [key, value] of Object.entries(scoreData.observations)) {
                obsParts.push(`### ${key.charAt(0).toUpperCase() + key.slice(1)}\n${value}`);
              }
              parts.push(`## Observations\n${obsParts.join('\n\n')}`);
            }
          }
          if (scoreData.recommendations) {
            if (Array.isArray(scoreData.recommendations)) {
              parts.push(`## Recommendations\n${scoreData.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
            } else if (typeof scoreData.recommendations === 'string') {
              parts.push(`## Recommendations\n${scoreData.recommendations}`);
            }
          }
          feedbackString = parts.join('\n\n');
          console.log('✅ Using verdict/observations/recommendations format (length:', feedbackString.length, 'chars)');
        } else if (typeof scoreData.feedback === 'string' && scoreData.feedback.trim().startsWith('{')) {
          // Handle case where feedback is a JSON string that needs parsing
          try {
            const parsedFeedback = JSON.parse(scoreData.feedback);
            console.log('✅ Parsed feedback JSON string, keys:', Object.keys(parsedFeedback));
            
            const parts = [];
            if (parsedFeedback.summary) {
              parts.push(`## Summary\n${parsedFeedback.summary}`);
            }
            if (Array.isArray(parsedFeedback.strengths) && parsedFeedback.strengths.length > 0) {
              parts.push(`## Strengths\n${parsedFeedback.strengths.map(s => `- ${s}`).join('\n')}`);
            }
            if (Array.isArray(parsedFeedback.weaknesses) && parsedFeedback.weaknesses.length > 0) {
              parts.push(`## Areas for Improvement\n${parsedFeedback.weaknesses.map(w => `- ${w}`).join('\n')}`);
            }
            if (Array.isArray(parsedFeedback.recommendations) && parsedFeedback.recommendations.length > 0) {
              parts.push(`## Recommendations\n${parsedFeedback.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
            }
            
            feedbackString = parts.join('\n\n') || scoreData.feedback;
            console.log('✅ Using parsed feedback JSON (length:', feedbackString.length, 'chars)');
          } catch (parseErr) {
            console.warn('⚠️ Failed to parse feedback JSON string, using as-is:', parseErr.message);
            feedbackString = scoreData.feedback;
          }
        } else {
          // Last resort fallback
          feedbackString = scoreData.summary_feedback || 'Feedback generated by Evaluator Agent';
          console.warn('⚠️ Using fallback feedback - no detailed_feedback, feedback_text, strengths/gaps, verdict/observations, or feedback found');
        }

        // Only combine summary and detailed if:
        // 1. We have summary_feedback AND
        // 2. We're NOT using detailed_feedback (which is already complete)
        // When detailed_feedback exists, it already contains everything - don't add prefixes
        if (!scoreData.detailed_feedback && summaryFeedback && feedbackString && feedbackString !== summaryFeedback) {
          // Only add prefix if we're using summary as main feedback (fallback case)
          feedbackString = `${summaryFeedback}\n\n---\n\n${feedbackString}`;
        }

        // Handle case where feedback might be an object instead of string
        // This can happen when AI returns feedback in unexpected formats
        if (typeof feedbackString === 'object' && feedbackString !== null) {
          console.warn('⚠️ Feedback is an object, converting to string...');
          // Try to format it nicely
          if (feedbackString.overall) {
            // Format: {overall: "...", structure: "...", ...}
            const parts = [];
            if (feedbackString.overall) parts.push(`## Overall Feedback\n${feedbackString.overall}`);
            if (feedbackString.structure) parts.push(`### Structure\n${feedbackString.structure}`);
            if (feedbackString.metrics) parts.push(`### Metrics\n${feedbackString.metrics}`);
            if (feedbackString.prioritization) parts.push(`### Prioritization\n${feedbackString.prioritization}`);
            if (feedbackString.user_empathy) parts.push(`### User Empathy\n${feedbackString.user_empathy}`);
            if (feedbackString.communication) parts.push(`### Communication\n${feedbackString.communication}`);
            feedbackString = parts.join('\n\n');
          } else if (feedbackString.summary) {
            // Format: {summary: "...", suggestions: [...]}
            const parts = [];
            if (feedbackString.summary) parts.push(`## Summary\n${feedbackString.summary}`);
            if (Array.isArray(feedbackString.suggestions)) {
              parts.push(`## Suggestions\n${feedbackString.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
            }
            feedbackString = parts.join('\n\n');
          } else {
            // Fallback: stringify the object
            feedbackString = JSON.stringify(feedbackString, null, 2);
          }
        }

        // Ensure feedbackString is a string (not undefined/null)
        if (!feedbackString || typeof feedbackString !== 'string') {
          console.warn('⚠️ Feedback string is not valid, using fallback');
          feedbackString = scoreData.summary_feedback || scoreData.feedback || 'No feedback available';
        }

        // Extract dimension scores (handle nested structure)
        const dims = scoreData.dimension_scores || {};
        
        // Log dimension scores for debugging
        console.log('🔍 Extracting dimension scores:', {
          dimsType: typeof dims,
          dimsKeys: Object.keys(dims),
          dimsValue: JSON.stringify(dims).substring(0, 200),
        });
        
        // Extract scores - handle both nested {score: X} and direct number formats
        // Also handle decimal scores (round to integer)
        const structure = Math.round(dims.structure?.score || dims.structure || 0);
        const metrics = Math.round(dims.metrics?.score || dims.metrics || 0);
        const prioritization = Math.round(dims.prioritization?.score || dims.prioritization || 0);
        const userEmpathy = Math.round(
          dims.userEmpathy?.score ||
          dims.userEmpathy ||
          dims.user_empathy?.score ||
          dims.user_empathy ||
          0
        );
        const communication = Math.round(dims.communication?.score || dims.communication || 0);
        
        console.log('✅ Extracted dimension scores:', {
          structure,
          metrics,
          prioritization,
          userEmpathy,
          communication,
          overallScore: scoreData.overall_score,
        });

        // Get sample answer (model answer) - use brutal_truth or detailed_feedback as fallback
        const sampleAnswer =
          scoreData.model_answer ||
          scoreData.brutal_truth ||
          scoreData.detailed_feedback ||
          'No sample answer available';

        // Calculate total score - use overall_score if available, otherwise average dimensions
        const totalScore = scoreData.overall_score !== undefined 
          ? Math.round(scoreData.overall_score)
          : Math.round((structure + metrics + prioritization + userEmpathy + communication) / 5);
        
        console.log('💾 Saving score to database:', {
          answerId,
          totalScore,
          structure,
          metrics,
          prioritization,
          userEmpathy,
          communication,
          feedbackLength: feedbackString.length,
        });
        
        // Save score to database (using correct Score model fields)
        const savedScore = await prisma.score.upsert({
          where: { answerId },
          create: {
            answerId,
            totalScore: totalScore,
            structure,
            metrics,
            prioritization,
            userEmpathy,
            communication,
            feedback: feedbackString,
            sampleAnswer: sampleAnswer,
            status: 'completed',
            tokensUsed: 0, // TODO: extract from agent result if available
          },
          update: {
            totalScore: totalScore,
            structure,
            metrics,
            prioritization,
            userEmpathy,
            communication,
            feedback: feedbackString,
            sampleAnswer: sampleAnswer,
            status: 'completed',
            tokensUsed: 0,
          },
        });

        console.log(
          `✓ Evaluator Agent scored answer (${
            agentResult.intermediateSteps?.length || 0
          } tool calls)`
        );

        return res.json({
          message: 'Answer scored successfully (via Evaluator Agent)',
          score: savedScore,
        });
      } catch (agentError) {
        console.error(
          '⚠️ Agent scoring failed, falling back to direct scoring:',
          agentError.message
        );
        // Fall through to direct scoring
      }
    }

    // Fallback to direct scoring (original method)
    console.log('📝 Using direct scoring method...');
    const scoreResult = await scoreSession(answer, conversationHistory);

    res.json({
      message: 'Answer scored successfully',
      score: scoreResult,
    });
  } catch (error) {
    next(error);
  }
};

const scoreSummarised = async (req, res, next) => {
  try {
    const { answerId, conversationHistory } = req.body;
    const userId = req.user?.id;

    // Fetch answer with question
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: true },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Verify ownership (only for authenticated users)
    if (userId && answer.userId && answer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already scored (look for any score for this answer)
    const existingScore = await prisma.score.findUnique({
      where: { answerId },
    });

    if (existingScore) {
      return res.json({
        message: 'Answer already scored',
        score: existingScore,
        isSummary: existingScore.status === 'completed_summary',
      });
    }

    // Use Evaluator Agent for summarised scoring if enabled, otherwise fallback to direct scoring
    if (USE_AGENTS) {
      try {
        console.log('🤖 Using Evaluator Agent for summarised scoring...');
        const { buildEvaluatorAgentSummarised } = require('../agents/subagents/evaluatorSummarised');
        const evaluator = await buildEvaluatorAgentSummarised();

        const agentInput = `Use the score_answer_summarised tool to score this PM interview answer with concise feedback:

Question: ${answer.question.text}
Category: ${answer.question.category || 'General'}
Answer: ${answer.answerText}
Question ID: ${answer.questionId}
${conversationHistory && conversationHistory.length > 0
  ? `\nConversation History: ${JSON.stringify(conversationHistory)}`
  : ''}

Call the score_answer_summarised tool with these exact parameters:
- question: "${answer.question.text}"
- answer: "${answer.answerText.substring(0, 500)}${answer.answerText.length > 500 ? '...' : ''}"
- category: "${answer.question.category || 'General'}"
- questionId: ${answer.questionId}
${conversationHistory && conversationHistory.length > 0
  ? `- conversationHistory: [${conversationHistory.length} messages]`
  : ''}

Return the tool's output JSON directly without any modification.`;

        const agentResult = await evaluator.invoke(agentInput, { userId });

        // Extract score data from tool results (same logic as detailed scoring)
        let scoreData;
        const toolResults = agentResult.intermediateSteps || [];
        const scoreToolResult = toolResults.find(step => {
          const toolName = step.action?.tool || step.action?.tool_name;
          return toolName === 'score_answer_summarised';
        });

        if (scoreToolResult && scoreToolResult.observation) {
          try {
            const observationStr =
              typeof scoreToolResult.observation === 'string'
                ? scoreToolResult.observation
                : JSON.stringify(scoreToolResult.observation);

            const toolOutput = JSON.parse(observationStr);
            if (toolOutput.success && toolOutput.scores) {
              scoreData = toolOutput.scores;
            } else if (toolOutput.scores) {
              scoreData = toolOutput.scores;
            } else if (toolOutput.overall_score) {
              scoreData = toolOutput;
            }
          } catch (parseErr) {
            console.warn('⚠️ Failed to parse tool observation:', parseErr.message);
            if (typeof scoreToolResult.observation === 'object') {
              scoreData = scoreToolResult.observation;
            }
          }
        }

        if (!scoreData) {
          console.error('❌ No score data found in agent response, falling back to direct scoring');
          throw new Error('Could not extract score data from agent response');
        }

        // Use the same score saving logic as direct scoring
        // Parse and format the score data (same as scoreSessionSummarised)
        const { parseAndValidateScore } = require('../services/openaiService');
        const validatedScoreData = parseAndValidateScore(JSON.stringify(scoreData));

        // Extract dimension scores (same logic as scoreSessionSummarised)
        const dims = validatedScoreData.dimension_scores || {};
        const structure = dims.structure?.score || dims.structure || 0;
        const metrics = dims.metrics?.score || dims.metrics || 0;
        const prioritization = dims.prioritization?.score || dims.prioritization || 0;
        const userEmpathy =
          dims.userEmpathy?.score ||
          dims.userEmpathy ||
          dims.user_empathy?.score ||
          dims.user_empathy ||
          0;
        const communication = dims.communication?.score || dims.communication || 0;

        // Calculate total score
        const { calculateWeightedScore } = require('../utils/scoringUtils');
        const totalScore = calculateWeightedScore({
          structure,
          metrics,
          prioritization,
          userEmpathy,
          communication,
        }) || validatedScoreData.overall_score || 0;

        // Format feedback (same as scoreSessionSummarised)
        const summaryFeedback = validatedScoreData.summary_feedback || '';

        // Save score (same as scoreSessionSummarised)
        const savedScore = await prisma.score.upsert({
          where: { answerId },
          create: {
            answerId,
            totalScore,
            structure,
            metrics,
            prioritization,
            userEmpathy,
            communication,
            feedback: summaryFeedback,
            sampleAnswer: '',
            status: 'completed_summary',
            tokensUsed: 0,
          },
          update: {
            totalScore,
            structure,
            metrics,
            prioritization,
            userEmpathy,
            communication,
            feedback: summaryFeedback,
            status: 'completed_summary',
            tokensUsed: 0,
          },
        });

        console.log(
          `✓ Evaluator Agent scored answer (summarised) (${
            agentResult.intermediateSteps?.length || 0
          } tool calls)`
        );

        return res.json({
          message: 'Answer scored successfully (via Evaluator Agent - summarised)',
          score: savedScore,
          isSummary: true,
        });
      } catch (agentError) {
        console.error(
          '⚠️ Agent summarised scoring failed, falling back to direct scoring:',
          agentError.message
        );
        // Fall through to direct scoring
      }
    }

    // Fallback to direct scoring (original method)
    console.log('📝 Using direct summarised scoring method...');
    const scoreResult = await scoreSessionSummarised(answer, conversationHistory);

    res.json({
      message: 'Answer scored successfully',
      score: scoreResult,
      isSummary: true,
    });
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const answers = await prisma.answer.findMany({
      where: { userId: req.user.id },
      include: {
        question: {
          select: { text: true, category: true },
        },
        scores: true,
        practiceSession: {
          select: { id: true, startedAt: true, endedAt: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ answers });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const answerId = parseInt(req.params.id);

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        scores: true,
        practiceSession: true,
      },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Verify ownership
    if (answer.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ answer });
  } catch (error) {
    next(error);
  }
};

const clarify = async (req, res, next) => {
  try {
    const { questionId, userMessage, conversationHistory } = req.body;
    const userId = req.user?.id;

    // Validate inputs
    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    // Get the question from database
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Use Interviewer Agent if enabled, otherwise fallback to direct clarification
    if (USE_AGENTS) {
      try {
        console.log('🤖 Using Interviewer Agent for clarification...');
        const interviewer = await buildInterviewerAgent();

        const agentInput = `The candidate is asking a clarifying question about this PM interview question:

Question: ${question.text}
Category: ${question.category || 'General'}

Candidate's question: ${userMessage}

${
  conversationHistory && conversationHistory.length > 0
    ? `\nPrevious conversation context:\n${conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n')}`
    : ''
}

Provide a helpful, realistic clarification as an interviewer would. Keep it concise (1-3 sentences typically).`;

        const agentResult = await interviewer.invoke(
          agentInput, // LangChain v1.0 expects string or { messages: [...] }
          { userId }
        );

        // The interviewer agent returns plain text
        const response =
          typeof agentResult.output === 'string'
            ? agentResult.output
            : JSON.stringify(agentResult.output);

        // Log the clarification event (only for authenticated users)
        if (userId) {
          await prisma.event.create({
            data: {
              userId,
              eventType: 'clarification_requested',
              metadata: JSON.stringify({
                questionId,
                userMessage: userMessage.substring(0, 100),
                agentUsed: true,
                toolCalls: agentResult.intermediateSteps?.length || 0,
              }),
            },
          });
        }

        console.log(
          `✓ Interviewer Agent provided clarification (${
            agentResult.intermediateSteps?.length || 0
          } tool calls)`
        );

        return res.json({
          response,
          message: 'Clarification provided (via Interviewer Agent)',
        });
      } catch (agentError) {
        console.error(
          '⚠️ Agent clarification failed, falling back to direct method:',
          agentError.message
        );
        // Fall through to direct clarification
      }
    }

    // Fallback to direct clarification (original method)
    console.log('📝 Using direct clarification method...');

    // Detect if this is an RCA question
    const categoryLower = question.category?.toLowerCase() || '';
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

    // Fetch RAG context for clarification (optional, gracefully degrades)
    let ragContext = null;
    if (process.env.USE_RAG !== 'false') {
      try {
        ragContext = await fetchRagContext({
          question: question.text,
          category: question.category,
          k: 3, // Fewer docs for clarifications to keep context lean
        });
        if (ragContext) {
          console.log('✓ RAG context fetched for clarification');
        }
      } catch (ragError) {
        console.warn('RAG context fetch failed for clarification:', ragError.message);
      }
    }

    // Prepend RAG context to conversation history if available
    const enhancedHistory = ragContext
      ? [
          {
            role: 'system',
            content: ragContext,
          },
          ...(conversationHistory || []),
        ]
      : conversationHistory || [];

    // Call appropriate OpenAI function based on category
    const { response, tokensUsed } = isRCAQuestion
      ? await callOpenAIForRCAClarification(question.text, enhancedHistory)
      : isGuesstiMate
      ? await callOpenAIForGuesstimate(question.text, enhancedHistory)
      : await callOpenAIForClarification(question.text, enhancedHistory);

    // Log the clarification event (only for authenticated users)
    if (userId) {
      await prisma.event.create({
        data: {
          userId,
          eventType: 'clarification_requested',
          metadata: JSON.stringify({
            questionId,
            userMessage: userMessage.substring(0, 100), // Store first 100 chars
            tokensUsed,
          }),
        },
      });
    }

    res.json({
      response,
      message: 'Clarification provided',
    });
  } catch (error) {
    console.error('Clarification error:', error);
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    // Get unique categories with question counts
    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Format category names for display and filter out unwanted categories
    const unwantedCategories = ['project_management', 'customer_interaction', 'machine_learning'];

    const formattedCategories = categories
      .filter(cat => !unwantedCategories.includes(cat.category))
      .map(cat => ({
        value: cat.category,
        label: cat.category
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        count: cat._count.id,
      }));

    res.json({
      categories: formattedCategories,
    });
  } catch (error) {
    next(error);
  }
};

const getModelAnswer = async (req, res, next) => {
  try {
    const { questionId } = req.body;
    const userId = req.user?.id;

    // Get question with category
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Try to get cached AI exemplar first
    const { getBestExemplar } = require('../services/exemplarService');
    const cachedExemplar = await getBestExemplar(question.id);

    let modelAnswer;
    let fromCache = false;

    if (cachedExemplar && cachedExemplar.source === 'ai_generated') {
      // Use cached AI-generated exemplar
      modelAnswer = cachedExemplar.content;
      fromCache = true;
      console.log(`✓ Serving cached model answer for Q${question.id}`);
    } else {
      // Generate new model answer and optionally cache it
      console.log(`⚙️  Generating model answer for Q${question.id}...`);

    const categoryLower = question.category?.toLowerCase() || '';
    const isRCAQuestion =
      categoryLower === 'rca' ||
      categoryLower.includes('root cause') ||
      categoryLower.includes('rca');

    const isGuesstiMate =
      categoryLower.includes('guesstimate') ||
      categoryLower.includes('market sizing') ||
      categoryLower.includes('estimation') ||
      categoryLower === 'quantitative';

      modelAnswer = isRCAQuestion
      ? await generateRCAModelAnswer(question.text)
      : isGuesstiMate
      ? await generateGuesstiMateModelAnswer(question.text)
      : await generateModelAnswer(question.text);

      // Cache the generated answer for future requests (async, don't wait)
      const { exemplarInsert } = require('../utils/vector');
      exemplarInsert({
        questionId: question.id,
        source: 'ai_generated',
        author: 'GPT-5',
        title: `AI Exemplar: ${question.text.substring(0, 100)}`,
        content: modelAnswer,
        keyPoints: null,
        qualityScore: 10,
        version: 1,
        sourceUrl: null,
        sourceHash: null,
      }).catch(err => console.error('Failed to cache model answer:', err.message));
    }

    // Log event (only for authenticated users)
    if (userId) {
      await prisma.event.create({
        data: {
          userId,
          eventType: 'model_answer_viewed',
          metadata: JSON.stringify({
            questionId: question.id,
            category: question.category,
            fromCache,
          }),
        },
      });
    }

    res.json({
      modelAnswer,
      questionText: question.text,
      category: question.category,
      fromCache,
    });
  } catch (error) {
    console.error('Get model answer error:', error);
    next(error);
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  score,
  scoreSummarised,
  clarify,
  getSessions,
  getSessionById,
  getCategories,
  getModelAnswer,
};
