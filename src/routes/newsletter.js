const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter (public endpoint)
 */
router.post('/subscribe', newsletterController.subscribeToNewsletter);

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe from newsletter (public endpoint)
 */
router.post('/unsubscribe', newsletterController.unsubscribeFromNewsletter);

/**
 * GET /api/newsletter/subscribers
 * Get all newsletter subscribers (protected - admin only)
 */
router.get('/subscribers', authMiddleware, adminMiddleware, newsletterController.getSubscribers);

module.exports = router;
