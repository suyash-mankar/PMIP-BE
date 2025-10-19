const express = require('express');
const { startSession, endSession, getCurrentSession } = require('../controllers/sessionController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/start', authMiddleware, startSession);
router.post('/end', authMiddleware, endSession);
router.get('/current', authMiddleware, getCurrentSession);

module.exports = router;
