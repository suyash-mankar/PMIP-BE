const prisma = require('../config/database');

const getFlaggedSessions = async (req, res, next) => {
  try {
    const flaggedSessions = await prisma.session.findMany({
      where: { status: 'needs_review' },
      include: {
        user: {
          select: { id: true, email: true },
        },
        question: {
          select: { text: true, category: true, level: true },
        },
        scores: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      count: flaggedSessions.length,
      sessions: flaggedSessions,
    });
  } catch (error) {
    next(error);
  }
};

const getMetrics = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Token usage per day
    const tokenUsage = await prisma.event.groupBy({
      by: ['eventType'],
      where: {
        createdAt: { gte: startDate },
        eventType: 'openai_call',
      },
      _sum: {
        tokensUsed: true,
      },
    });

    // Total sessions
    const totalSessions = await prisma.session.count({
      where: { createdAt: { gte: startDate } },
    });

    // Scored sessions
    const scoredSessions = await prisma.session.count({
      where: {
        createdAt: { gte: startDate },
        status: 'scored',
      },
    });

    // Flagged sessions
    const flaggedSessions = await prisma.session.count({
      where: {
        createdAt: { gte: startDate },
        status: 'needs_review',
      },
    });

    // New users
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: startDate } },
    });

    // Revenue
    const revenue = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    res.json({
      period: `Last ${days} days`,
      metrics: {
        totalTokensUsed: tokenUsage[0]?._sum?.tokensUsed || 0,
        totalSessions,
        scoredSessions,
        flaggedSessions,
        newUsers,
        revenue: (revenue._sum.amount || 0) / 100, // Convert cents to dollars
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFlaggedSessions, getMetrics };
