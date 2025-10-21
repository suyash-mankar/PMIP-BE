const express = require('express');
const {
  startInterview,
  submitAnswer,
  score,
  scoreSummarised,
  clarify,
  getSessions,
  getSessionById,
  getCategories,
  getModelAnswer,
} = require('../controllers/interviewController');
const { authMiddleware } = require('../middlewares/auth');
const { optionalAuthMiddleware } = require('../middlewares/optionalAuth');
const { checkUsageLimit, trackQuestionUsage } = require('../controllers/usageController');
const { scoringLimiter } = require('../middlewares/rateLimiter');
const {
  validate,
  startInterviewSchema,
  submitAnswerSchema,
  scoreSchema,
} = require('../utils/validation');

const router = express.Router();

// Usage tracking endpoints (allow anonymous)
router.post('/check-limit', optionalAuthMiddleware, checkUsageLimit);
router.post('/track-usage', optionalAuthMiddleware, trackQuestionUsage);

// Interview endpoints (allow anonymous with optional auth)
router.post(
  '/start-interview',
  optionalAuthMiddleware,
  validate(startInterviewSchema),
  startInterview
);
router.post('/submit-answer', optionalAuthMiddleware, validate(submitAnswerSchema), submitAnswer);
router.post('/score', optionalAuthMiddleware, validate(scoreSchema), score);
router.post('/score-summarised', optionalAuthMiddleware, validate(scoreSchema), scoreSummarised);
router.post('/clarify', optionalAuthMiddleware, clarify);
router.post('/model-answer', optionalAuthMiddleware, getModelAnswer);

// Get categories (public)
router.get('/categories', getCategories);

// Session/history endpoints (require authentication)
router.get('/sessions', authMiddleware, getSessions);
router.get('/sessions/:id', authMiddleware, getSessionById);

module.exports = router;
