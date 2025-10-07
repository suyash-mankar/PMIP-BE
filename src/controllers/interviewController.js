const prisma = require('../config/database');
const { scoreSession } = require('../services/scoreService');
const { callOpenAIForClarification } = require('../services/openaiService');

const startInterview = async (req, res, next) => {
  try {
    const { level } = req.body;

    // Get random question for the specified level
    const questions = await prisma.question.findMany({
      where: { level },
    });

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions found for this level' });
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'question_fetched',
        metadata: JSON.stringify({ questionId: question.id, level }),
      },
    });

    res.json({
      id: question.id,
      text: question.text,
      category: question.category,
      level: question.level,
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

module.exports = {
  startInterview,
  submitAnswer,
  score,
  clarify,
  getSessions,
  getSessionById,
};
