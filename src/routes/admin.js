const express = require('express');
const { getFlaggedSessions, getMetrics } = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.get('/flagged-sessions', authMiddleware, adminMiddleware, getFlaggedSessions);
router.get('/metrics', authMiddleware, adminMiddleware, getMetrics);

module.exports = router;
