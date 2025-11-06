const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  getLinkedInStatus,
  saveLinkedInCookie,
  testLinkedInCookie,
  removeLinkedInCookie,
} = require('../controllers/integrationsController');

/**
 * Integration routes
 * All routes require authentication
 */

// LinkedIn integration endpoints
router.get('/linkedin', authMiddleware, getLinkedInStatus);
router.post('/linkedin', authMiddleware, saveLinkedInCookie);
router.post('/linkedin/test', authMiddleware, testLinkedInCookie);
router.delete('/linkedin', authMiddleware, removeLinkedInCookie);

module.exports = router;

