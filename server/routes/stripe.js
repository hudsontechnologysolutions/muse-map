const express = require('express');
const Stripe = require('stripe');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/create-checkout-session
// Creates a Stripe Checkout session for the selected plan
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const plan = 'monthly'; // only monthly organizer plan is supported
    const priceId = process.env.STRIPE_PRICE_MONTHLY;

    const user = await User.findById(req.user._id);

    // Reuse existing Stripe customer, or create a new one.
    // If the stored customer ID is from a different Stripe mode (test vs live)
    // or was deleted, the retrieve call fails — fall through to create a fresh one.
    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) customerId = null;
      } catch (err) {
        console.warn('[stripe] stored customer not usable, creating new:', err.message);
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      user.stripeSubscriptionId = null;
      user.subscriptionStatus = 'inactive';
      user.subscriptionPlan = null;
      user.currentPeriodEnd = null;
      await user.save({ validateBeforeSave: false });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      metadata: { userId: user._id.toString(), plan },
      subscription_data: {
        metadata: { userId: user._id.toString(), plan },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/stripe/webhook
// Stripe sends events here — updates subscription status in DB
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await User.findByIdAndUpdate(userId, {
            role: 'organizer',
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            currentPeriodEnd: subscription.current_period_end && !isNaN(subscription.current_period_end)
              ? new Date(subscription.current_period_end * 1000)
              : null,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
            currentPeriodEnd: subscription.current_period_end && !isNaN(subscription.current_period_end)
              ? new Date(subscription.current_period_end * 1000)
              : null,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            subscriptionPlan: null,
            currentPeriodEnd: null,
          });
          console.log(`❌ Subscription canceled for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          await User.findByIdAndUpdate(userId, { subscriptionStatus: 'past_due' });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }

  res.json({ received: true });
});

// POST /api/stripe/portal
// Sends user to Stripe's billing portal to manage/cancel their subscription
router.post('/portal', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No billing account found.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/my-events`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stripe/status
// Returns current subscription status for the logged-in user
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      currentPeriodEnd: user.currentPeriodEnd,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;