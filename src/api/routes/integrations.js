/**
 * Integrations API Routes
 * Handles connection status and OAuth flows for external services
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAvailableIntegrations, getOAuthUrl, INTEGRATIONS } = require('../services/n8n-integration');

/**
 * GET /api/integrations/status
 * Get all integrations with user's connection status
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const db = req.app.get('db');
        const userId = req.user.id;

        // Get user's connections from database
        let connections = [];
        if (db && db.query) {
            try {
                const result = await db.query(
                    `SELECT service, status, connected_at, last_used
                     FROM user_integrations
                     WHERE user_id = $1`,
                    [userId]
                );
                connections = result.rows;
            } catch (dbError) {
                // Table might not exist yet, that's ok
                console.log('user_integrations table not ready:', dbError.message);
            }
        }

        res.json({
            connections,
            available: Object.entries(INTEGRATIONS).map(([key, int]) => ({
                id: key,
                name: int.name,
                icon: int.icon,
                actions: int.actions
            }))
        });
    } catch (error) {
        console.error('Error fetching integrations status:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * POST /api/integrations/connect/:service
 * Initiate OAuth connection for a service
 */
router.post('/connect/:service', authMiddleware, async (req, res) => {
    try {
        const { service } = req.params;
        const userId = req.user.id;

        // Check if service exists
        if (!INTEGRATIONS[service]) {
            return res.status(400).json({ error: 'Service not supported' });
        }

        // Generate OAuth URL (when N8N is configured)
        const redirectUrl = `${req.protocol}://${req.get('host')}/api/integrations/callback`;
        const oauthUrl = getOAuthUrl(service, userId, redirectUrl);

        if (oauthUrl && process.env.N8N_URL) {
            res.json({ oauthUrl });
        } else {
            // N8N not configured - return instructions
            res.json({
                message: `Pour connecter ${INTEGRATIONS[service].name}, configure N8N avec les credentials OAuth.`,
                setupRequired: true,
                service: INTEGRATIONS[service]
            });
        }
    } catch (error) {
        console.error('Error initiating connection:', error);
        res.status(500).json({ error: 'Failed to initiate connection' });
    }
});

/**
 * POST /api/integrations/disconnect/:service
 * Disconnect a service
 */
router.post('/disconnect/:service', authMiddleware, async (req, res) => {
    try {
        const { service } = req.params;
        const userId = req.user.id;
        const db = req.app.get('db');

        if (!db || !db.query) {
            return res.status(500).json({ error: 'Database not available' });
        }

        await db.query(
            `UPDATE user_integrations
             SET status = 'disconnected', credentials = NULL
             WHERE user_id = $1 AND service = $2`,
            [userId, service]
        );

        res.json({ success: true, message: `${service} disconnected` });
    } catch (error) {
        console.error('Error disconnecting service:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

/**
 * GET /api/integrations/callback
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, service, userId, error } = req.query;

        if (error) {
            return res.redirect('/app.html?error=oauth_denied');
        }

        // Parse state parameter (contains userId and service)
        // This would be handled by N8N in production

        // For now, redirect back to app
        res.redirect('/app.html?connected=' + (service || 'unknown'));
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/app.html?error=oauth_failed');
    }
});

module.exports = router;
