const express = require('express');
const router = express.Router();
const { analyzeResume, getResumeProfile } = require('../controllers/resumeController');
const { authMiddleware } = require('../middlewares/auth');

// POST /api/resume/analyze - Analyze resume and get personalized plan
router.post('/analyze', authMiddleware, analyzeResume);

// GET /api/resume/profile - Get stored resume profile
router.get('/profile', authMiddleware, getResumeProfile);

module.exports = router;
