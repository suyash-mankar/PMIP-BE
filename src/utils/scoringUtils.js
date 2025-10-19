// Parameter weights for calculating overall weighted score
const PARAMETER_WEIGHTS = {
  structure: 0.2, // 20%
  metrics: 0.2, // 20%
  prioritization: 0.25, // 25%
  userEmpathy: 0.2, // 20%
  communication: 0.15, // 15%
};

/**
 * Calculate weighted overall score from individual parameter scores
 * @param {Object} scores - Object containing individual parameter scores
 * @returns {number} - Weighted overall score (0-10)
 */
const calculateWeightedScore = scores => {
  const {
    structure = 0,
    metrics = 0,
    prioritization = 0,
    userEmpathy = 0,
    communication = 0,
  } = scores;

  const weightedScore =
    structure * PARAMETER_WEIGHTS.structure +
    metrics * PARAMETER_WEIGHTS.metrics +
    prioritization * PARAMETER_WEIGHTS.prioritization +
    userEmpathy * PARAMETER_WEIGHTS.userEmpathy +
    communication * PARAMETER_WEIGHTS.communication;

  return Math.round(weightedScore * 10) / 10; // Round to 1 decimal place
};

/**
 * Calculate average scores across multiple sessions
 * @param {Array} sessions - Array of session objects with scores
 * @returns {Object} - Average scores for each parameter
 */
const calculateAverageScores = sessions => {
  if (!sessions || sessions.length === 0) {
    return {
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      overall: 0,
    };
  }

  const totals = {
    structure: 0,
    metrics: 0,
    prioritization: 0,
    userEmpathy: 0,
    communication: 0,
  };

  let count = 0;

  sessions.forEach(session => {
    if (session.scores) {
      totals.structure += session.scores.structure || 0;
      totals.metrics += session.scores.metrics || 0;
      totals.prioritization += session.scores.prioritization || 0;
      totals.userEmpathy += session.scores.userEmpathy || 0;
      totals.communication += session.scores.communication || 0;
      count++;
    }
  });

  if (count === 0) {
    return {
      structure: 0,
      metrics: 0,
      prioritization: 0,
      userEmpathy: 0,
      communication: 0,
      overall: 0,
    };
  }

  const averages = {
    structure: Math.round((totals.structure / count) * 10) / 10,
    metrics: Math.round((totals.metrics / count) * 10) / 10,
    prioritization: Math.round((totals.prioritization / count) * 10) / 10,
    userEmpathy: Math.round((totals.userEmpathy / count) * 10) / 10,
    communication: Math.round((totals.communication / count) * 10) / 10,
  };

  averages.overall = calculateWeightedScore(averages);

  return averages;
};

/**
 * Group sessions by category and calculate stats
 * @param {Array} sessions - Array of session objects with scores and question
 * @returns {Object} - Stats grouped by category
 */
const groupByCategory = sessions => {
  const categoryStats = {};

  sessions.forEach(session => {
    if (!session.question || !session.scores) return;

    const category = session.question.category;

    if (!categoryStats[category]) {
      categoryStats[category] = {
        count: 0,
        totals: {
          structure: 0,
          metrics: 0,
          prioritization: 0,
          userEmpathy: 0,
          communication: 0,
        },
      };
    }

    categoryStats[category].count++;
    categoryStats[category].totals.structure += session.scores.structure || 0;
    categoryStats[category].totals.metrics += session.scores.metrics || 0;
    categoryStats[category].totals.prioritization += session.scores.prioritization || 0;
    categoryStats[category].totals.userEmpathy += session.scores.userEmpathy || 0;
    categoryStats[category].totals.communication += session.scores.communication || 0;
  });

  // Calculate averages
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    const count = stats.count;

    stats.averages = {
      structure: Math.round((stats.totals.structure / count) * 10) / 10,
      metrics: Math.round((stats.totals.metrics / count) * 10) / 10,
      prioritization: Math.round((stats.totals.prioritization / count) * 10) / 10,
      userEmpathy: Math.round((stats.totals.userEmpathy / count) * 10) / 10,
      communication: Math.round((stats.totals.communication / count) * 10) / 10,
    };

    stats.averages.overall = calculateWeightedScore(stats.averages);
  });

  return categoryStats;
};

/**
 * Group sessions by time period (day, week, month)
 * @param {Array} sessions - Array of session objects with scores
 * @param {string} period - 'day', 'week', or 'month'
 * @returns {Array} - Array of time-based statistics
 */
const groupByTimePeriod = (sessions, period = 'day') => {
  const timeStats = {};

  sessions.forEach(session => {
    if (!session.scores || !session.createdAt) return;

    const date = new Date(session.createdAt);
    let key;

    if (period === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!timeStats[key]) {
      timeStats[key] = {
        date: key,
        count: 0,
        scores: [],
      };
    }

    timeStats[key].count++;
    timeStats[key].scores.push({
      structure: session.scores.structure || 0,
      metrics: session.scores.metrics || 0,
      prioritization: session.scores.prioritization || 0,
      userEmpathy: session.scores.userEmpathy || 0,
      communication: session.scores.communication || 0,
    });
  });

  // Calculate averages for each time period
  const result = Object.values(timeStats).map(stat => {
    const averages = calculateAverageScores(stat.scores.map(s => ({ scores: s })));
    return {
      date: stat.date,
      count: stat.count,
      ...averages,
    };
  });

  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
};

module.exports = {
  PARAMETER_WEIGHTS,
  calculateWeightedScore,
  calculateAverageScores,
  groupByCategory,
  groupByTimePeriod,
};
