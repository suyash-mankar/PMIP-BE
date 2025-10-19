const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getParameterStats,
  getTimelineStats,
  getProgressHistory,
  getCategoryStats,
} = require('../controllers/progressController');
const { authMiddleware } = require('../middlewares/auth');

// All progress routes require authentication
router.use(authMiddleware);

// GET /api/progress/dashboard - Overall dashboard statistics
router.get('/dashboard', getDashboardStats);

// GET /api/progress/parameters - Parameter-wise statistics
router.get('/parameters', getParameterStats);

// GET /api/progress/timeline - Time-based progress
router.get('/timeline', getTimelineStats);

// GET /api/progress/history - Detailed question history with filters
router.get('/history', getProgressHistory);

// GET /api/progress/categories - Enhanced category statistics
router.get('/categories', getCategoryStats);

module.exports = router;
