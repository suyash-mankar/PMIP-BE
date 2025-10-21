const { prisma } = require('../config/database');

/**
 * Check if anonymous user can practice more questions
 * @param {string} fingerprint - Browser fingerprint
 * @param {string} ipAddress - User's IP address
 * @returns {Promise<Object>} Usage status
 */
async function checkAnonymousLimit(fingerprint, ipAddress) {
  try {
    // Use upsert to avoid race condition issues
    const session = await prisma.anonymousSession.upsert({
      where: { fingerprint },
      update: {
        // Just update the IP if it changed (don't increment count here)
        ipAddress,
      },
      create: {
        fingerprint,
        ipAddress,
        questionCount: 0,
      },
    });

    const questionsRemaining = Math.max(0, 3 - session.questionCount);

    return {
      isAuthenticated: false,
      planType: 'anonymous',
      canPractice: session.questionCount < 3,
      questionsUsed: session.questionCount,
      questionsRemaining,
      questionsLimit: 3,
      limitMessage: `${questionsRemaining} of 3 free questions remaining`,
      isLocked: {
        category: true,
        voice: true,
        timer: true,
        dashboard: true,
        history: true,
      },
    };
  } catch (error) {
    console.error('❌ Error checking anonymous limit:', error);
    throw error;
  }
}

/**
 * Increment question count for anonymous user
 * @param {string} fingerprint - Browser fingerprint
 * @param {string} ipAddress - User's IP address
 * @returns {Promise<Object>} Updated session
 */
async function incrementAnonymousCount(fingerprint, ipAddress) {
  try {
    // Use upsert to handle race conditions
    const session = await prisma.anonymousSession.upsert({
      where: { fingerprint },
      update: {
        questionCount: { increment: 1 },
        lastQuestionDate: new Date(),
        ipAddress, // Update IP in case it changed
      },
      create: {
        fingerprint,
        ipAddress,
        questionCount: 1,
        lastQuestionDate: new Date(),
      },
    });

    return session;
  } catch (error) {
    console.error('❌ Error incrementing anonymous count:', error);
    throw error;
  }
}

/**
 * Check if 48-hour trial has expired
 * @param {Object} user - User object with trialStartDate
 * @returns {boolean} True if trial expired
 */
function checkTrialExpired(user) {
  if (user.planType === 'pro_trial' && user.trialStartDate) {
    const hoursSinceStart = (Date.now() - user.trialStartDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceStart >= 48;
  }
  return false;
}

/**
 * Calculate remaining trial hours
 * @param {Object} user - User object with trialStartDate
 * @returns {number} Hours remaining
 */
function getRemainingTrialHours(user) {
  if (user.planType === 'pro_trial' && user.trialStartDate) {
    const hoursSinceStart = (Date.now() - user.trialStartDate.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 48 - hoursSinceStart);
  }
  return 0;
}

/**
 * Reset monthly question count if needed
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
async function resetMonthlyCountIfNeeded(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) return null;

    const now = new Date();
    const lastReset = user.lastQuestionResetDate || user.createdAt;
    const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);

    // Reset if more than 30 days have passed
    if (daysSinceReset >= 30) {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyQuestionCount: 0,
          lastQuestionResetDate: now,
        },
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
    }

    return user;
  } catch (error) {
    console.error('Error resetting monthly count:', error);
    throw error;
  }
}

/**
 * Check authenticated user limits and status
 * @param {Object} user - User object
 * @returns {Promise<Object>} User status
 */
async function checkUserLimit(user) {
  try {
    // Reset monthly count if needed
    const updatedUser = await resetMonthlyCountIfNeeded(user.id);
    const currentUser = updatedUser || user;

    const trialExpired = checkTrialExpired(currentUser);
    const remainingHours = getRemainingTrialHours(currentUser);

    // Pro paid user - unlimited access
    if (currentUser.planType === 'pro_paid') {
      return {
        isAuthenticated: true,
        planType: 'pro_paid',
        canPractice: true,
        questionsUsed: currentUser.monthlyQuestionCount,
        questionsRemaining: 'Unlimited',
        questionsLimit: 'Unlimited',
        limitMessage: 'Pro plan active',
        trialExpired: false,
        isLocked: {
          category: false,
          voice: false,
          timer: false,
          dashboard: false,
          history: false,
        },
      };
    }

    // Pro trial user
    if (currentUser.planType === 'pro_trial') {
      if (trialExpired) {
        // Trial expired - downgrade to free
        await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            planType: 'free',
            monthlyQuestionCount: 0,
            lastQuestionResetDate: new Date(),
          },
        });

        return {
          isAuthenticated: true,
          planType: 'free',
          canPractice: true,
          questionsUsed: 0,
          questionsRemaining: 3,
          questionsLimit: 3,
          limitMessage: '3 questions left this month',
          trialExpired: true,
          trialHoursRemaining: 0,
          isLocked: {
            category: true,
            voice: true,
            timer: true,
            dashboard: false,
            history: false,
          },
        };
      }

      // Trial active
      return {
        isAuthenticated: true,
        planType: 'pro_trial',
        canPractice: true,
        questionsUsed: currentUser.monthlyQuestionCount,
        questionsRemaining: 'Unlimited',
        questionsLimit: 'Unlimited',
        limitMessage: `Pro trial: ${Math.ceil(remainingHours)} hours remaining`,
        trialExpired: false,
        trialHoursRemaining: remainingHours,
        isLocked: {
          category: false,
          voice: false,
          timer: false,
          dashboard: false,
          history: false,
        },
      };
    }

    // Free user
    const questionsRemaining = Math.max(0, 3 - currentUser.monthlyQuestionCount);
    return {
      isAuthenticated: true,
      planType: 'free',
      canPractice: currentUser.monthlyQuestionCount < 3,
      questionsUsed: currentUser.monthlyQuestionCount,
      questionsRemaining,
      questionsLimit: 3,
      limitMessage: `${questionsRemaining} questions left this month`,
      trialExpired: false,
      isLocked: {
        category: true,
        voice: true,
        timer: true,
        dashboard: false,
        history: false,
      },
    };
  } catch (error) {
    console.error('Error checking user limit:', error);
    throw error;
  }
}

/**
 * Increment question count for authenticated user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
async function incrementUserCount(userId) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuestionCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error('Error incrementing user count:', error);
    throw error;
  }
}

/**
 * Get user status (wrapper for checkUserLimit)
 * @param {Object} user - User object
 * @returns {Promise<Object>} User status
 */
async function getUserStatus(user) {
  return await checkUserLimit(user);
}

module.exports = {
  checkAnonymousLimit,
  incrementAnonymousCount,
  checkUserLimit,
  incrementUserCount,
  resetMonthlyCountIfNeeded,
  checkTrialExpired,
  getRemainingTrialHours,
  getUserStatus,
};
