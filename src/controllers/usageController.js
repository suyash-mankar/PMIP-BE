const {
  checkAnonymousLimit,
  checkUserLimit,
  incrementAnonymousCount,
  incrementUserCount,
} = require('../services/usageService');

/**
 * Check usage limit for authenticated or anonymous user
 */
const checkUsageLimit = async (req, res, next) => {
  try {
    const { fingerprint } = req.body;

    if (req.user) {
      // Authenticated user
      const status = await checkUserLimit(req.user);
      return res.json(status);
    } else {
      // Anonymous user
      if (!fingerprint) {
        return res.status(400).json({ error: 'Fingerprint is required for anonymous users' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const status = await checkAnonymousLimit(fingerprint, ipAddress);
      return res.json(status);
    }
  } catch (error) {
    console.error('Error in checkUsageLimit:', error);
    // Return fallback anonymous status if database fails
    return res.json({
      isAuthenticated: false,
      planType: 'anonymous',
      canPractice: true,
      questionsUsed: 0,
      questionsRemaining: 3,
      questionsLimit: 3,
      limitMessage: '3 of 3 free questions remaining',
      isLocked: {
        category: true,
        voice: true,
        timer: true,
        dashboard: true,
        history: true,
      },
    });
  }
};

/**
 * Track question usage (increment count)
 */
const trackQuestionUsage = async (req, res, next) => {
  try {
    const { fingerprint } = req.body;

    if (req.user) {
      // Authenticated user
      await incrementUserCount(req.user.id);
      const status = await checkUserLimit(req.user);
      return res.json({
        message: 'Usage tracked',
        status,
      });
    } else {
      // Anonymous user
      if (!fingerprint) {
        return res.status(400).json({ error: 'Fingerprint is required for anonymous users' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      await incrementAnonymousCount(fingerprint, ipAddress);
      const status = await checkAnonymousLimit(fingerprint, ipAddress);
      return res.json({
        message: 'Usage tracked',
        status,
      });
    }
  } catch (error) {
    console.error('Error in trackQuestionUsage:', error);
    // Return success with fallback status if database fails
    return res.json({
      message: 'Usage tracked (fallback mode)',
      status: {
        isAuthenticated: false,
        planType: 'anonymous',
        canPractice: true,
        questionsUsed: 1,
        questionsRemaining: 2,
        questionsLimit: 3,
        limitMessage: '2 of 3 free questions remaining',
        isLocked: {
          category: true,
          voice: true,
          timer: true,
          dashboard: true,
          history: true,
        },
      },
    });
  }
};

module.exports = {
  checkUsageLimit,
  trackQuestionUsage,
};
