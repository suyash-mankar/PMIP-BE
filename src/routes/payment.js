const express = require('express');
const {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  getSubscriptionStatus,
} = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/auth');
const { validate, createCheckoutSchema } = require('../utils/validation');

const router = express.Router();

// Create Razorpay subscription
router.post(
  '/create-checkout-session',
  authMiddleware,
  validate(createCheckoutSchema),
  createCheckoutSession
);

// Razorpay webhook - must use raw body
router.post(
  '/webhook/razorpay',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  handleWebhook
);

// Cancel subscription
router.post('/cancel-subscription', authMiddleware, cancelSubscription);

// Get subscription status
router.get('/subscription-status', authMiddleware, getSubscriptionStatus);

module.exports = router;
