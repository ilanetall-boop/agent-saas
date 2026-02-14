const express = require('express');
const db = require('../db/db');
const { authMiddleware } = require('../middleware/auth');
const { log: auditLog } = require('../services/audit-log');
const stripe = require('../services/stripe');

const router = express.Router();

/**
 * POST /api/payments/checkout
 * Create a checkout session for tier upgrade
 */
router.post('/checkout', authMiddleware, async (req, res) => {
    try {
        const { tier } = req.body;
        const userId = req.user.id;
        
        if (!tier || !['pro', 'enterprise', 'vip'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        
        // Get user
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get current tier from DB
        const currentTier = user.subscription_tier || 'free';
        
        // Prevent downgrade (free -> pro is ok, but pro -> free requires cancellation)
        const tierOrder = { free: 0, pro: 1, enterprise: 2, vip: 3 };
        if (tierOrder[tier] <= tierOrder[currentTier]) {
            return res.status(400).json({ 
                error: 'Upgrade required',
                message: 'You can only upgrade to a higher tier'
            });
        }
        
        // Create checkout session
        const frontendUrl = process.env.FRONTEND_URL || 'https://mybestagent.io';
        const session = await stripe.createCheckoutSession(
            userId,
            tier,
            `${frontendUrl}/checkout/success`,
            `${frontendUrl}/checkout/cancel`
        );
        
        // Log payment initiation
        auditLog({
            type: 'payment_initiated',
            userId,
            tier,
            sessionId: session.sessionId,
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            sessionId: session.sessionId,
            url: session.url
        });
    } catch (error) {
        console.error('[PAYMENTS] Checkout error:', error);
        auditLog({
            type: 'payment_error',
            userId: req.user.id,
            error: error.message,
            ipAddress: req.ip
        });
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * GET /api/payments/checkout/:sessionId
 * Get checkout session status
 */
router.get('/checkout/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        // Get session from Stripe
        const session = await stripe.getCheckoutSession(sessionId);
        
        // Verify session belongs to user
        if (session.metadata?.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json({
            success: true,
            status: session.payment_status,
            tier: session.metadata?.tier,
            subscriptionId: session.subscription,
            customer: session.customer_details
        });
    } catch (error) {
        console.error('[PAYMENTS] Checkout status error:', error);
        res.status(500).json({ error: 'Failed to get checkout status' });
    }
});

/**
 * POST /api/payments/subscription/cancel
 * Cancel subscription
 */
router.post('/subscription/cancel', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user and subscription
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!user.stripe_subscription_id) {
            return res.status(400).json({ error: 'No active subscription' });
        }
        
        // Cancel subscription
        const result = await stripe.cancelSubscription(user.stripe_subscription_id);
        
        // Update user in DB (downgrade to free)
        await db.updateUser(userId, {
            subscription_tier: 'free',
            stripe_subscription_id: null,
            stripe_customer_id: null
        });
        
        // Log cancellation
        auditLog({
            type: 'subscription_cancelled',
            userId,
            subscriptionId: result.subscriptionId,
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            newTier: 'free'
        });
    } catch (error) {
        console.error('[PAYMENTS] Subscription cancellation error:', error);
        auditLog({
            type: 'subscription_cancellation_error',
            userId: req.user.id,
            error: error.message,
            ipAddress: req.ip
        });
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

/**
 * GET /api/payments/subscription
 * Get current subscription status
 */
router.get('/subscription', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const currentTier = user.subscription_tier || 'free';
        
        let subscriptionInfo = {
            tier: currentTier,
            status: 'active',
            subscriptionId: null,
            nextBillingDate: null,
            cancelAt: null
        };
        
        if (user.stripe_subscription_id) {
            const subscription = await stripe.getSubscription(user.stripe_subscription_id);
            subscriptionInfo = {
                tier: currentTier,
                status: subscription.status,
                subscriptionId: subscription.id,
                nextBillingDate: new Date(subscription.current_period_end * 1000),
                cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
                items: subscription.items.data.map(item => ({
                    productId: item.plan.product,
                    priceId: item.price.id,
                    amount: item.price.unit_amount,
                    currency: item.price.currency,
                    interval: item.price.recurring?.interval
                }))
            };
        }
        
        res.json({
            success: true,
            subscription: subscriptionInfo
        });
    } catch (error) {
        console.error('[PAYMENTS] Subscription info error:', error);
        res.status(500).json({ error: 'Failed to get subscription info' });
    }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        
        if (!signature) {
            return res.status(400).json({ error: 'Missing stripe signature' });
        }
        
        // Verify webhook signature
        const isValid = stripe.verifyWebhookSignature(req.body.toString(), signature);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const event = JSON.parse(req.body.toString());
        const result = await stripe.handleWebhookEvent(event);
        
        if (!result.processed) {
            console.log(`[STRIPE] Unhandled event: ${event.type}`);
            return res.json({ received: true });
        }
        
        // Handle specific events that need database updates
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            const tier = session.metadata?.tier;
            
            if (userId && tier) {
                // Update user in DB
                await db.updateUser(userId, {
                    subscription_tier: tier,
                    stripe_subscription_id: session.subscription,
                    stripe_customer_id: session.customer
                });
                
                // Log subscription activated
                auditLog({
                    type: 'subscription_activated',
                    userId,
                    tier,
                    subscriptionId: session.subscription,
                    stripeCustomerId: session.customer
                });
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            // Find user with this subscription and downgrade to free
            // (requires DB query - would need to update schema to track this)
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('[STRIPE] Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
