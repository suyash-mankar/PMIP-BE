const express = require('express');
const { createCheckoutSession, handleWebhook } = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/auth');
const { validate, createCheckoutSchema } = require('../utils/validation');

const router = express.Router();

router.post(
  '/create-checkout-session',
  authMiddleware,
  validate(createCheckoutSchema),
  createCheckoutSession
);

// Stripe webhook - must use raw body
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

module.exports = router;
