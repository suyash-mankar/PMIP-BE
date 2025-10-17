const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  googleAuth,
  googleAuthCallback,
} = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../utils/validation');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/login?error=Authentication failed',
  }),
  googleAuthCallback
);

module.exports = router;
