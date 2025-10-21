const { prisma } = require('../config/database');

// Helper function to calculate session summary
function calculateSessionSummary(session) {
  const answers = session.answers;
  const categories = {};
  let totalScore = 0;
  let scoredCount = 0;

  answers.forEach(answer => {
    const category = answer.question.category;
    categories[category] = (categories[category] || 0) + 1;

    if (answer.scores) {
      totalScore += answer.scores.totalScore;
      scoredCount++;
    }
  });

  return {
    sessionId: session.id,
    questionsCount: answers.length,
    categoriesBreakdown: categories,
    overallScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : null,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    duration: session.endedAt
      ? Math.floor((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
      : null,
  };
}

// Start new practice session
const startSession = async (req, res, next) => {
  try {
    // Check if user has active session
    const activeSession = await prisma.practiceSession.findFirst({
      where: { userId: req.user.id, status: 'active' },
    });

    if (activeSession) {
      return res.json({
        sessionId: activeSession.id,
        message: 'Active session resumed',
        isNewSession: false,
      });
    }

    // Create new session
    const session = await prisma.practiceSession.create({
      data: { userId: req.user.id, status: 'active' },
    });

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'practice_session_started',
        metadata: JSON.stringify({ sessionId: session.id }),
      },
    });

    res.json({
      sessionId: session.id,
      message: 'Session started',
      isNewSession: true,
    });
  } catch (error) {
    next(error);
  }
};

// End session and get summary
const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    // Verify ownership and get session with answers
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: {
          include: {
            question: { select: { category: true } },
            scores: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.status === 'completed') {
      // Session already completed, just return summary
      const summary = calculateSessionSummary(session);
      return res.json({ summary, message: 'Session already completed' });
    }

    // Calculate summary statistics
    const summary = calculateSessionSummary(session);

    // Mark session as completed
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: new Date() },
    });

    // Log event
    await prisma.event.create({
      data: {
        userId: req.user.id,
        eventType: 'practice_session_ended',
        metadata: JSON.stringify({
          sessionId: session.id,
          questionsCount: summary.questionsCount,
          overallScore: summary.overallScore,
        }),
      },
    });

    res.json({ summary, message: 'Session ended successfully' });
  } catch (error) {
    next(error);
  }
};

// Get current active session
const getCurrentSession = async (req, res, next) => {
  try {
    const session = await prisma.practiceSession.findFirst({
      where: { userId: req.user.id, status: 'active' },
      include: {
        answers: {
          include: {
            question: { select: { id: true, text: true, category: true } },
            scores: { select: { totalScore: true } },
          },
        },
      },
    });

    res.json({ session });
  } catch (error) {
    next(error);
  }
};

module.exports = { startSession, endSession, getCurrentSession };
