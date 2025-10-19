const prisma = require('../config/database');
const { scoreSession, scoreSessionSummarised } = require('../services/scoreService');
const { callOpenAIForClarification, generateModelAnswer } = require('../services/openaiService');

const startInterview = async (req, res, next) => {
  try {
    const { category } = req.body;

    // Build query conditions
    const whereClause = {};
    if (category) whereClause.category = category;

    // Get random question for the specified criteria
    const questions = await prisma.question.findMany({
      where: whereClause,
    });

    if (questions.length === 0) {
      const errorMessage = category
        ? `No questions found for category: ${category}`
        : `No questions found`;
      return res.status(404).json({ error: errorMessage });
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'question_fetched',
        metadata: JSON.stringify({
          questionId: question.id,
          category: question.category,
          source: question.source,
        }),
      },
    });

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
    const { questionId, answerText, sessionId } = req.body;

    // If sessionId provided, update existing session
    if (sessionId) {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { answerText },
      });
      return res.json({ sessionId: session.id, message: 'Answer updated' });
    }

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: req.user.id,
        questionId,
        answerText,
        status: 'submitted',
      },
    });

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        sessionId: session.id,
        eventType: 'answer_submitted',
        metadata: JSON.stringify({ questionId }),
      },
    });

    res.status(201).json({
      sessionId: session.id,
      message: 'Answer submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const score = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    // Fetch session with question
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { question: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already scored
    const existingScore = await prisma.score.findUnique({
      where: { sessionId },
    });

    // If existing score is a summary, update it with detailed feedback
    if (existingScore && existingScore.status === 'completed_summary') {
      console.log('Updating summary score with detailed feedback...');

      // Score the session using OpenAI for detailed feedback
      const scoreResult = await scoreSession(session);

      return res.json({
        message: 'Session scored successfully with detailed feedback',
        score: scoreResult,
      });
    }

    // If already scored with detailed feedback, return it
    if (existingScore) {
      return res.json({
        message: 'Session already scored',
        score: existingScore,
      });
    }

    // Score the session using OpenAI
    const scoreResult = await scoreSession(session);

    res.json({
      message: 'Session scored successfully',
      score: scoreResult,
    });
  } catch (error) {
    next(error);
  }
};

const scoreSummarised = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    // Fetch session with question
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { question: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already scored (look for any score for this session)
    const existingScore = await prisma.score.findUnique({
      where: { sessionId },
    });

    if (existingScore) {
      return res.json({
        message: 'Session already scored',
        score: existingScore,
        isSummary: existingScore.status === 'completed_summary',
      });
    }

    // Score the session using OpenAI with summarised feedback
    const scoreResult = await scoreSessionSummarised(session);

    res.json({
      message: 'Session scored successfully',
      score: scoreResult,
      isSummary: true,
    });
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id },
      include: {
        question: {
          select: { text: true, category: true, level: true },
        },
        scores: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        question: true,
        scores: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
};

const clarify = async (req, res, next) => {
  try {
    const { questionId, userMessage, conversationHistory } = req.body;

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

    // Call OpenAI for clarification
    const { response, tokensUsed } = await callOpenAIForClarification(
      question.text,
      conversationHistory || []
    );

    // Log the clarification event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'clarification_requested',
        metadata: JSON.stringify({
          questionId,
          userMessage: userMessage.substring(0, 100), // Store first 100 chars
          tokensUsed,
        }),
      },
    });

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

    // Get question text
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Generate model answer
    const modelAnswer = await generateModelAnswer(question.text);

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'model_answer_viewed',
        metadata: JSON.stringify({
          questionId: question.id,
        }),
      },
    });

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
