const { prisma } = require('../config/database');

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
exports.subscribeToNewsletter = async (req, res) => {
  try {
    const { email, source } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing) {
      // If already subscribed and active
      if (existing.status === 'active') {
        return res.status(200).json({
          message: "You're already subscribed to our newsletter!",
          subscription: existing,
        });
      }

      // If previously unsubscribed, reactivate
      const updated = await prisma.newsletterSubscription.update({
        where: { email },
        data: {
          status: 'active',
          source: source || 'landing_page',
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        message: "Welcome back! You've been re-subscribed to our newsletter.",
        subscription: updated,
      });
    }

    // Create new subscription
    const subscription = await prisma.newsletterSubscription.create({
      data: {
        email,
        source: source || 'landing_page',
        status: 'active',
      },
    });

    return res.status(201).json({
      message: 'Successfully subscribed to newsletter!',
      subscription,
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return res.status(500).json({
      error: 'Failed to subscribe to newsletter. Please try again.',
    });
  }
};

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 */
exports.unsubscribeFromNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Email not found in our records' });
    }

    if (subscription.status === 'unsubscribed') {
      return res.status(200).json({
        message: "You're already unsubscribed",
      });
    }

    await prisma.newsletterSubscription.update({
      where: { email },
      data: { status: 'unsubscribed', updatedAt: new Date() },
    });

    return res.status(200).json({
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to unsubscribe. Please try again.',
    });
  }
};

/**
 * Get all active newsletter subscriptions (Admin only)
 * GET /api/newsletter/subscribers
 */
exports.getSubscribers = async (req, res) => {
  try {
    const { status } = req.query;

    const where = status ? { status } : {};

    const subscribers = await prisma.newsletterSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    const stats = await prisma.newsletterSubscription.groupBy({
      by: ['status'],
      _count: true,
    });

    return res.status(200).json({
      subscribers,
      stats,
      total: subscribers.length,
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    return res.status(500).json({
      error: 'Failed to fetch subscribers',
    });
  }
};
