const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// Middleware that allows both authenticated and anonymous users
// Sets req.user if token exists, otherwise allows request to continue
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            role: true,
            planType: true,
            trialStartDate: true,
            subscriptionEndDate: true,
            monthlyQuestionCount: true,
            lastQuestionResetDate: true,
            createdAt: true,
          },
        });
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Invalid token, continue as anonymous
        console.log('Invalid token, continuing as anonymous:', err.message);
      }
    }

    // Continue regardless of auth status
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { optionalAuthMiddleware };
