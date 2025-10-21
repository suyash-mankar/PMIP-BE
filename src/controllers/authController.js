const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with 48-hour Pro trial
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        planType: 'pro_trial',
        trialStartDate: now,
        subscriptionEndDate: trialEndDate,
        monthlyQuestionCount: 0,
        lastQuestionResetDate: now,
      },
      select: {
        id: true,
        email: true,
        role: true,
        planType: true,
        trialStartDate: true,
        subscriptionEndDate: true,
        createdAt: true,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is a Google OAuth user without password
    if (!user.password && user.provider === 'google') {
      return res.status(400).json({
        error: 'Please sign in with Google',
        message: 'This account uses Google sign-in. Please use the "Sign in with Google" button.',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth handlers
const googleAuth = (req, res, next) => {
  // This will be handled by passport middleware
};

const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/login?token=${token}`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/login?error=Authentication failed`);
  }
};

module.exports = { register, login, googleAuth, googleAuthCallback };
