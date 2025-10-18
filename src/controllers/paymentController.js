const razorpay = require('../config/razorpay');
const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Create a Razorpay subscription for Pro plan
 * Supports both USD and INR currencies
 */
const createCheckoutSession = async (req, res, next) => {
  try {
    const { currency = 'usd' } = req.body; // 'usd' or 'inr'

    // Define pricing for different currencies
    const pricing = {
      usd: {
        amount: 900, // $9 in cents
        currency: 'USD',
        planId: process.env.RAZORPAY_PLAN_ID_USD,
        name: 'Pro Plan - USD',
      },
      inr: {
        amount: 49900, // Rs. 499 in paise
        currency: 'INR',
        planId: process.env.RAZORPAY_PLAN_ID_INR,
        name: 'Pro Plan - INR',
      },
    };

    const selectedPlan = pricing[currency.toLowerCase()];

    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid currency. Use USD or INR.' });
    }

    if (!selectedPlan.planId) {
      console.error(`Razorpay plan ID not configured for ${currency}`);
      return res.status(500).json({
        error: 'Payment configuration error. Please contact support.',
      });
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: selectedPlan.planId,
      customer_notify: 1,
      total_count: 12, // 12 months (can be adjusted or made infinite)
      notes: {
        userId: req.user.id.toString(),
        email: req.user.email,
        subscriptionType: 'pro',
      },
    });

    // Create pending payment record in database
    await prisma.payment.create({
      data: {
        userId: req.user.id,
        razorpaySubscriptionId: subscription.id,
        amount: selectedPlan.amount,
        currency: currency.toLowerCase(),
        status: 'pending',
        subscriptionType: 'pro',
      },
    });

    // Return subscription details to frontend
    res.json({
      subscriptionId: subscription.id,
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      planName: selectedPlan.name,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      userEmail: req.user.email,
      userName: req.user.email.split('@')[0], // Use email prefix as name
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    next(error);
  }
};

/**
 * Handle Razorpay webhook events
 * Events: subscription.activated, subscription.charged, subscription.cancelled, payment.failed
 */
const handleWebhook = async (req, res, next) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event;
    const payload = event.payload;

    console.log(`📥 Razorpay webhook received: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case 'subscription.activated': {
        const subscription = payload.subscription.entity;

        // Update payment record to completed
        const payment = await prisma.payment.findUnique({
          where: { razorpaySubscriptionId: subscription.id },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'completed',
              razorpayCustomerId: subscription.customer_id,
              subscriptionEndDate: new Date(subscription.current_end * 1000), // Convert Unix timestamp
            },
          });

          // Log event
          await prisma.event.create({
            data: {
              userId: payment.userId,
              eventType: 'webhook',
              metadata: JSON.stringify({
                type: 'subscription.activated',
                subscriptionId: subscription.id,
              }),
            },
          });

          console.log(`✅ Subscription activated: ${subscription.id}`);
        }
        break;
      }

      case 'subscription.charged': {
        const payment = payload.payment.entity;
        const subscription = payload.subscription.entity;

        // Find and update payment record
        const existingPayment = await prisma.payment.findUnique({
          where: { razorpaySubscriptionId: subscription.id },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              razorpayPaymentId: payment.id,
              status: 'completed',
              subscriptionEndDate: new Date(subscription.current_end * 1000),
              updatedAt: new Date(),
            },
          });

          // Log renewal
          await prisma.event.create({
            data: {
              userId: existingPayment.userId,
              eventType: 'webhook',
              metadata: JSON.stringify({
                type: 'subscription.charged',
                subscriptionId: subscription.id,
                paymentId: payment.id,
                amount: payment.amount,
              }),
            },
          });

          console.log(`💰 Subscription charged: ${subscription.id}`);
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.subscription.entity;

        // Update payment status to cancelled
        await prisma.payment.updateMany({
          where: { razorpaySubscriptionId: subscription.id },
          data: {
            status: 'cancelled',
            updatedAt: new Date(),
          },
        });

        const payment = await prisma.payment.findUnique({
          where: { razorpaySubscriptionId: subscription.id },
        });

        if (payment) {
          await prisma.event.create({
            data: {
              userId: payment.userId,
              eventType: 'webhook',
              metadata: JSON.stringify({
                type: 'subscription.cancelled',
                subscriptionId: subscription.id,
              }),
            },
          });
        }

        console.log(`❌ Subscription cancelled: ${subscription.id}`);
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;

        // Try to find payment by notes or description
        if (payment.notes && payment.notes.userId) {
          await prisma.event.create({
            data: {
              userId: parseInt(payment.notes.userId),
              eventType: 'webhook',
              metadata: JSON.stringify({
                type: 'payment.failed',
                paymentId: payment.id,
                reason: payment.error_description,
              }),
            },
          });
        }

        console.log(`⚠️  Payment failed: ${payment.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    next(error);
  }
};

/**
 * Cancel a subscription
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find active subscription
    const payment = await prisma.payment.findFirst({
      where: {
        userId: userId,
        status: 'completed',
        subscriptionType: 'pro',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment || !payment.razorpaySubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel subscription in Razorpay
    await razorpay.subscriptions.cancel(payment.razorpaySubscriptionId, {
      cancel_at_cycle_end: 1, // Cancel at end of billing period
    });

    res.json({
      message: 'Subscription will be cancelled at the end of the current billing period',
      subscriptionEndDate: payment.subscriptionEndDate,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    next(error);
  }
};

/**
 * Get user's subscription status
 */
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payment = await prisma.payment.findFirst({
      where: {
        userId: userId,
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return res.json({
        subscriptionType: 'free',
        status: 'inactive',
      });
    }

    const isActive = payment.subscriptionEndDate && payment.subscriptionEndDate > new Date();

    res.json({
      subscriptionType: isActive ? payment.subscriptionType : 'free',
      status: isActive ? 'active' : 'expired',
      subscriptionEndDate: payment.subscriptionEndDate,
      currency: payment.currency,
      amount: payment.amount,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    next(error);
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  getSubscriptionStatus,
};
