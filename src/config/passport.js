const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./database');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        // Check if user exists by googleId
        let user = await prisma.user.findUnique({
          where: { googleId },
        });

        if (user) {
          // User found with this Google ID
          return done(null, user);
        }

        // Check if user exists by email (account linking)
        user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Link Google account to existing user
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId,
              provider: 'google',
            },
          });
          return done(null, user);
        }

        // Create new user with Google account and 48-hour Pro trial
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

        user = await prisma.user.create({
          data: {
            email,
            googleId,
            provider: 'google',
            password: null, // No password for Google users
            planType: 'pro_trial',
            trialStartDate: now,
            subscriptionEndDate: trialEndDate,
            monthlyQuestionCount: 0,
            lastQuestionResetDate: now,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
