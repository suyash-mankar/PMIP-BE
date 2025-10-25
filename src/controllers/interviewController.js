const { safeQuery, prisma } = require('../utils/dbHelper');
const { scoreSession, scoreSessionSummarised } = require('../services/scoreService');
const {
  callOpenAIForClarification,
  callOpenAIForRCAClarification,
  generateModelAnswer,
} = require('../services/openaiService');

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

    // Get random question for the specified criteria
    const questions = await safeQuery(
      db => db.question.findMany({ where: whereClause }),
      [],
      'Fetch questions'
    );

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
    const isRCAQuestion =
      question.category === 'RCA' ||
      question.category?.toLowerCase().includes('root cause') ||
      question.category?.toLowerCase().includes('rca');

    // Call appropriate OpenAI function based on category
    const { response, tokensUsed } = isRCAQuestion
      ? await callOpenAIForRCAClarification(question.text, conversationHistory || [])
      : await callOpenAIForClarification(question.text, conversationHistory || []);

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

    // Get question text
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Generate model answer
    const modelAnswer = await generateModelAnswer(question.text);

    // Log event (only for authenticated users)
    if (userId) {
      await prisma.event.create({
        data: {
          userId,
          eventType: 'model_answer_viewed',
          metadata: JSON.stringify({
            questionId: question.id,
          }),
        },
      });
    }

    res.json({
      modelAnswer,
      questionText: question.text,
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
