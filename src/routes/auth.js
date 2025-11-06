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
  (req, res, next) => {
    // Store redirect URL in cookie for later use
    const redirectUrl = req.query.redirect || '/interview';
    res.cookie('oauth_redirect', redirectUrl, {
      httpOnly: false, // Need to read it in frontend
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60000, // 1 minute
    });
    // Pass redirect as state parameter to Google OAuth
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })(req, res, next);
  }
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
