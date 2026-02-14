/**
 * Stripe Payment Service
 * Handles payment processing, subscriptions, and billing
 */

const https = require('https');
const { v4: uuidv4 } = require('uuid');

const STRIPE_API_VERSION = '2023-10-16';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Make a request to Stripe API
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g., '/checkout/sessions')
 * @param {object} data - Request data
 * @returns {Promise<object>}
 */
async function stripeRequest(method, path, data = {}) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        
        if (!apiKey) {
            reject(new Error('STRIPE_SECRET_KEY not configured'));
            return;
        }
        
        // Prepare request body
        let body = '';
        if (method !== 'GET' && Object.keys(data).length > 0) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    value.forEach((v, i) => params.append(`${key}[${i}]`, v));
                } else if (typeof value === 'object') {
                    for (const [k, v] of Object.entries(value)) {
                        params.append(`${key}[${k}]`, v);
                    }
                } else {
                    params.append(key, value);
                }
            }
            body = params.toString();
        }
        
        const options = {
            hostname: 'api.stripe.com',
            port: 443,
            path,
            method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Stripe-Version': STRIPE_API_VERSION
            }
        };
        
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }
        
        const req = https.request(options, (res) => {
            let responseBody = '';
            
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseBody);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`Stripe API error: ${response.error?.message || responseBody}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Stripe response: ${responseBody}`));
                }
            });
        });
        
        req.on('error', reject);
        
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

/**
 * Create a checkout session for tier upgrade
 * @param {string} userId - User ID
 * @param {string} tier - Tier name (pro, enterprise, vip)
 * @param {string} successUrl - Success redirect URL
 * @param {string} cancelUrl - Cancel redirect URL
 * @returns {Promise<{sessionId: string, url: string}>}
 */
async function createCheckoutSession(userId, tier, successUrl, cancelUrl) {
    const tierPrices = {
        pro: {
            priceId: process.env.STRIPE_PRICE_PRO || 'price_pro',
            amount: 1900, // €19.00 in cents
            currency: 'eur',
            interval: 'month'
        },
        enterprise: {
            priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
            amount: 4900, // €49.00 in cents
            currency: 'eur',
            interval: 'month'
        },
        vip: {
            priceId: process.env.STRIPE_PRICE_VIP || 'price_vip',
            amount: 9900, // €99.00 in cents
            currency: 'eur',
            interval: 'month'
        }
    };
    
    const tierInfo = tierPrices[tier];
    if (!tierInfo) {
        throw new Error(`Invalid tier: ${tier}`);
    }
    
    try {
        const session = await stripeRequest('POST', '/checkout/sessions', {
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: null, // Will be set by frontend
            line_items: [{
                price: tierInfo.priceId,
                quantity: 1
            }],
            subscription_data: {
                metadata: {
                    userId,
                    tier
                }
            },
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                tier
            }
        });
        
        return {
            sessionId: session.id,
            url: session.url,
            tier
        };
    } catch (error) {
        console.error('[STRIPE] Failed to create checkout session:', error);
        throw error;
    }
}

/**
 * Get checkout session details
 * @param {string} sessionId - Stripe session ID
 * @returns {Promise<object>}
 */
async function getCheckoutSession(sessionId) {
    try {
        const session = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
        return session;
    } catch (error) {
        console.error('[STRIPE] Failed to get checkout session:', error);
        throw error;
    }
}

/**
 * Get subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>}
 */
async function getSubscription(subscriptionId) {
    try {
        const subscription = await stripeRequest('GET', `/subscriptions/${subscriptionId}`);
        return subscription;
    } catch (error) {
        console.error('[STRIPE] Failed to get subscription:', error);
        throw error;
    }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>}
 */
async function cancelSubscription(subscriptionId) {
    try {
        const subscription = await stripeRequest('DELETE', `/subscriptions/${subscriptionId}`);
        return {
            success: true,
            subscriptionId: subscription.id,
            status: subscription.status
        };
    } catch (error) {
        console.error('[STRIPE] Failed to cancel subscription:', error);
        throw error;
    }
}

/**
 * Verify webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Promise<boolean>}
 */
function verifyWebhookSignature(body, signature) {
    const crypto = require('crypto');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!secret) {
        console.warn('[STRIPE] STRIPE_WEBHOOK_SECRET not configured - webhook verification skipped');
        return true; // Skip in dev if not configured
    }
    
    try {
        const [timestamp, hash] = signature.split(',').map(v => v.split('=')[1]);
        const signedContent = `${timestamp}.${body}`;
        const expected = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
        return hash === expected;
    } catch (error) {
        console.error('[STRIPE] Webhook signature verification failed:', error);
        return false;
    }
}

/**
 * Handle webhook event
 * @param {object} event - Stripe webhook event
 * @returns {Promise<{processed: boolean, message: string}>}
 */
async function handleWebhookEvent(event) {
    const eventType = event.type;
    const data = event.data.object;
    
    try {
        switch (eventType) {
            case 'checkout.session.completed':
                return {
                    processed: true,
                    message: 'Checkout session completed',
                    sessionId: data.id,
                    subscriptionId: data.subscription
                };
                
            case 'customer.subscription.created':
                return {
                    processed: true,
                    message: 'Subscription created',
                    subscriptionId: data.id,
                    status: data.status,
                    metadata: data.metadata
                };
                
            case 'customer.subscription.updated':
                return {
                    processed: true,
                    message: 'Subscription updated',
                    subscriptionId: data.id,
                    status: data.status
                };
                
            case 'customer.subscription.deleted':
                return {
                    processed: true,
                    message: 'Subscription cancelled',
                    subscriptionId: data.id
                };
                
            case 'invoice.payment_succeeded':
                return {
                    processed: true,
                    message: 'Invoice paid',
                    invoiceId: data.id,
                    subscriptionId: data.subscription
                };
                
            case 'invoice.payment_failed':
                return {
                    processed: true,
                    message: 'Invoice payment failed',
                    invoiceId: data.id,
                    subscriptionId: data.subscription
                };
                
            default:
                return {
                    processed: false,
                    message: `Unhandled event type: ${eventType}`
                };
        }
    } catch (error) {
        console.error('[STRIPE] Error handling webhook event:', error);
        throw error;
    }
}

module.exports = {
    stripeRequest,
    createCheckoutSession,
    getCheckoutSession,
    getSubscription,
    cancelSubscription,
    verifyWebhookSignature,
    handleWebhookEvent
};
