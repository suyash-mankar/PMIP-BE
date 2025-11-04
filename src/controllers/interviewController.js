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

    // Score the answer using OpenAI (pass conversation history for RCA)
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

    // Score the answer using OpenAI with summarised feedback (pass conversation history for RCA)
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
