require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const voiceRoutes = require('./routes/voice');
const progressRoutes = require('./routes/progress');
const sessionRoutes = require('./routes/session');
const newsletterRoutes = require('./routes/newsletter');
const resumeRoutes = require('./routes/resume');
const jobMatcherRoutes = require('./routes/jobMatcher');
const integrationsRoutes = require('./routes/integrations');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy (needed for Railway and other reverse proxies)
app.set('trust proxy', true);

// Security & Logging
app.use(helmet());
app.use(cors());
// app.use(morgan('combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', interviewRoutes);
app.use('/api', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/job-matcher', jobMatcherRoutes);
app.use('/api/integrations', integrationsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PM Interview Practice API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check available at: http://0.0.0.0:${PORT}/api/health`);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

module.exports = app;
