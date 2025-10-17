const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./database');

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

        // Create new user with Google account
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            provider: 'google',
            password: null, // No password for Google users
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
