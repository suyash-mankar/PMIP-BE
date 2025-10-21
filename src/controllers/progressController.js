const { prisma } = require('../config/database');
const {
  calculateWeightedScore,
  calculateAverageScores,
  groupByCategory,
  groupByTimePeriod,
} = require('../utils/scoringUtils');

/**
 * GET /api/progress/dashboard
 * Get overall dashboard statistics for the user
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all scored sessions
    const scoredSessions = await prisma.answer.findMany({
      where: {
        userId,
        scores: {
          isNot: null,
        },
      },
      include: {
        scores: true,
        question: {
          select: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate overall statistics
    const totalScored = scoredSessions.length;
    const averageScores = calculateAverageScores(scoredSessions);
    const categoryStats = groupByCategory(scoredSessions);

    // Get total questions available
    const totalQuestions = await prisma.question.count();

    // Get total questions viewed by user
    const totalViewed = await prisma.questionView.count({
      where: { userId },
    });

    // Calculate recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = scoredSessions.filter(
      session => new Date(session.createdAt) >= sevenDaysAgo
    );

    // Format category breakdown
    const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      solved: stats.count,
      averageScore: stats.averages.overall,
    }));

    res.json({
      totalScored,
      totalViewed,
      totalQuestionsAvailable: totalQuestions,
      questionsRemaining: totalQuestions - totalViewed,
      overallAverageScore: averageScores.overall,
      recentActivity: {
        last7Days: recentSessions.length,
      },
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
};

/**
 * GET /api/progress/parameters
 * Get parameter-wise statistics
 */
const getParameterStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all scored sessions
    const scoredSessions = await prisma.answer.findMany({
      where: {
        userId,
        scores: {
          isNot: null,
        },
      },
      include: {
        scores: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate average scores for each parameter
    const averageScores = calculateAverageScores(scoredSessions);

    // Calculate parameter trends over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = scoredSessions.filter(
      session => new Date(session.createdAt) >= thirtyDaysAgo
    );

    const timelineTrends = groupByTimePeriod(recentSessions, 'day');

    res.json({
      parameters: {
        structure: averageScores.structure,
        metrics: averageScores.metrics,
        prioritization: averageScores.prioritization,
        userEmpathy: averageScores.userEmpathy,
        communication: averageScores.communication,
      },
      weightedOverall: averageScores.overall,
      timeline: timelineTrends,
    });
  } catch (error) {
    console.error('Parameter stats error:', error);
    next(error);
  }
};

/**
 * GET /api/progress/timeline
 * Get time-based progress statistics
 */
const getTimelineStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'day', days = 30 } = req.query;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get scored sessions in date range
    const sessions = await prisma.answer.findMany({
      where: {
        userId,
        scores: {
          isNot: null,
        },
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        scores: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by time period
    const timeline = groupByTimePeriod(sessions, period);

    // Calculate summary stats
    const totalSessions = sessions.length;
    const averageScores = calculateAverageScores(sessions);

    res.json({
      timeline,
      summary: {
        totalSessions,
        averageScore: averageScores.overall,
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Timeline stats error:', error);
    next(error);
  }
};

/**
 * GET /api/progress/history
 * Get detailed question history with filters and pagination
 */
const getProgressHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      category,
      minScore,
      maxScore,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      search,
    } = req.query;

    // Build where clause
    const whereClause = {
      userId,
      scores: {
        isNot: null,
      },
    };

    // Filter by category
    if (category) {
      whereClause.question = {
        category,
      };
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Get sessions with filters
    let sessions = await prisma.answer.findMany({
      where: whereClause,
      include: {
        scores: true,
        question: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    // Filter by score range (in-memory because it's a relation)
    if (minScore !== undefined || maxScore !== undefined) {
      sessions = sessions.filter(session => {
        if (!session.scores) return false;
        const weightedScore = calculateWeightedScore({
          structure: session.scores.structure,
          metrics: session.scores.metrics,
          prioritization: session.scores.prioritization,
          userEmpathy: session.scores.userEmpathy,
          communication: session.scores.communication,
        });

        if (minScore !== undefined && weightedScore < parseFloat(minScore)) return false;
        if (maxScore !== undefined && weightedScore > parseFloat(maxScore)) return false;
        return true;
      });
    }

    // Filter by search text (in-memory)
    if (search) {
      const searchLower = search.toLowerCase();
      sessions = sessions.filter(session =>
        session.question.text.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = sessions.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;

    // Apply pagination
    const paginatedSessions = sessions.slice(skip, skip + limitNum);

    // Format response
    const formattedSessions = paginatedSessions.map(session => {
      const weightedScore = calculateWeightedScore({
        structure: session.scores.structure,
        metrics: session.scores.metrics,
        prioritization: session.scores.prioritization,
        userEmpathy: session.scores.userEmpathy,
        communication: session.scores.communication,
      });

      return {
        id: session.id,
        questionId: session.questionId,
        questionText: session.question.text,
        category: session.question.category,
        company: session.question.company ? JSON.parse(session.question.company) : [],
        answerText: session.answerText,
        scores: {
          structure: session.scores.structure,
          metrics: session.scores.metrics,
          prioritization: session.scores.prioritization,
          userEmpathy: session.scores.userEmpathy,
          communication: session.scores.communication,
          overall: weightedScore,
        },
        feedback: session.scores.feedback,
        createdAt: session.createdAt,
      };
    });

    res.json({
      sessions: formattedSessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (error) {
    console.error('Progress history error:', error);
    next(error);
  }
};

/**
 * GET /api/progress/categories
 * Get enhanced category statistics
 */
const getCategoryStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all scored sessions with questions
    const scoredSessions = await prisma.answer.findMany({
      where: {
        userId,
        scores: {
          isNot: null,
        },
      },
      include: {
        scores: true,
        question: {
          select: {
            category: true,
          },
        },
      },
    });

    // Group by category
    const categoryStats = groupByCategory(scoredSessions);

    // Get total questions per category
    const categoryCounts = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    // Get viewed questions per category
    const viewedByCategory = await prisma.questionView.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            category: true,
          },
        },
      },
    });

    const viewedCounts = {};
    viewedByCategory.forEach(view => {
      const category = view.question.category;
      viewedCounts[category] = (viewedCounts[category] || 0) + 1;
    });

    // Combine data
    const categories = categoryCounts.map(cat => {
      const category = cat.category;
      const stats = categoryStats[category] || {
        count: 0,
        averages: {
          structure: 0,
          metrics: 0,
          prioritization: 0,
          userEmpathy: 0,
          communication: 0,
          overall: 0,
        },
      };

      return {
        category,
        totalAvailable: cat._count.id,
        solved: stats.count,
        viewed: viewedCounts[category] || 0,
        unsolved: cat._count.id - (viewedCounts[category] || 0),
        averageScore: stats.averages.overall,
        parameters: {
          structure: stats.averages.structure,
          metrics: stats.averages.metrics,
          prioritization: stats.averages.prioritization,
          userEmpathy: stats.averages.userEmpathy,
          communication: stats.averages.communication,
        },
      };
    });

    res.json({ categories });
  } catch (error) {
    console.error('Category stats error:', error);
    next(error);
  }
};

/**
 * GET /api/progress/sessions
 * Get completed practice sessions for dashboard
 */
const getUserSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.practiceSession.findMany({
      where: { userId, status: 'completed' },
      include: {
        answers: {
          include: {
            question: { select: { category: true } },
            scores: { select: { totalScore: true } },
          },
        },
      },
      orderBy: { endedAt: 'desc' },
      take: 20, // Limit to most recent 20 sessions
    });

    // Calculate summary for each session
    const sessionSummaries = sessions.map(session => {
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
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.endedAt
          ? Math.floor((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
          : null,
        questionsCount: answers.length,
        categoriesBreakdown: categories,
        overallScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : null,
      };
    });

    res.json({ sessions: sessionSummaries });
  } catch (error) {
    console.error('Get user sessions error:', error);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getParameterStats,
  getTimelineStats,
  getProgressHistory,
  getCategoryStats,
  getUserSessions,
};
