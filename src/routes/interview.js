const express = require('express');
const {
  startInterview,
  submitAnswer,
  score,
  clarify,
  getSessions,
  getSessionById,
  getCategories,
} = require('../controllers/interviewController');
const { authMiddleware } = require('../middlewares/auth');
const { scoringLimiter } = require('../middlewares/rateLimiter');
const {
  validate,
  startInterviewSchema,
  submitAnswerSchema,
  scoreSchema,
} = require('../utils/validation');

const router = express.Router();

router.post('/start-interview', authMiddleware, validate(startInterviewSchema), startInterview);

router.post('/submit-answer', authMiddleware, validate(submitAnswerSchema), submitAnswer);

router.post('/score', authMiddleware, scoringLimiter, validate(scoreSchema), score);

router.post('/clarify', authMiddleware, clarify);

router.get('/sessions', authMiddleware, getSessions);
router.get('/sessions/:id', authMiddleware, getSessionById);
router.get('/categories', authMiddleware, getCategories);

module.exports = router;
