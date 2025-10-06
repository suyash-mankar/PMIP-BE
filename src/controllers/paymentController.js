const stripe = require('../config/stripe');
const prisma = require('../config/database');

const createCheckoutSession = async (req, res, next) => {
  try {
    const { subscriptionType = 'basic' } = req.body;

    // Define pricing (you can make these env variables)
    const prices = {
      basic: { amount: 2900, name: 'Basic Plan' }, // $29.00
      premium: { amount: 4900, name: 'Premium Plan' }, // $49.00
    };

    const price = prices[subscriptionType];
    if (!price) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: price.name,
              description: `PM Interview Practice - ${price.name}`,
            },
            unit_amount: price.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      client_reference_id: req.user.id.toString(),
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
        subscriptionType,
      },
    });

    // Create pending payment record
    await prisma.payment.create({
      data: {
        userId: req.user.id,
        stripeSessionId: session.id,
        amount: price.amount,
        currency: 'usd',
        status: 'pending',
        subscriptionType,
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Update payment record
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: {
            status: 'completed',
            stripeCustomerId: session.customer,
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        // Log event
        const payment = await prisma.payment.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (payment) {
          await prisma.event.create({
            data: {
              userId: payment.userId,
              eventType: 'webhook',
              metadata: JSON.stringify({
                type: 'checkout.session.completed',
                sessionId: session.id,
              }),
            },
          });
        }

        console.log(`✅ Payment completed for session ${session.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        // Handle subscription cancellation
        await prisma.payment.updateMany({
          where: { stripeCustomerId: subscription.customer },
          data: { status: 'cancelled' },
        });
        console.log(`❌ Subscription cancelled for customer ${subscription.customer}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    next(error);
  }
};

module.exports = { createCheckoutSession, handleWebhook };
