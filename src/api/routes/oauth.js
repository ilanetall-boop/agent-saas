const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateDualTokens, authMiddleware } = require('../middleware/auth');
const { log: auditLog } = require('../services/audit-log');
const oauth = require('../services/oauth');

const router = express.Router();

/**
 * GET /api/oauth/config (DEBUG)
 * Check OAuth configuration status
 */
router.get('/config', (req, res) => {
    const config = {
        google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ? '✅ Set' : '❌ Missing',
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
            redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ? '✅ Set' : '❌ Missing',
            value: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'not set'
        },
        github: {
            clientId: process.env.GITHUB_OAUTH_CLIENT_ID ? '✅ Set' : '❌ Missing',
            clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
            redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI ? '✅ Set' : '❌ Missing',
            value: process.env.GITHUB_OAUTH_REDIRECT_URI || 'not set'
        }
    };
    
    console.log('🔧 OAuth Configuration:', config);
    res.json(config);
});

/**
 * GET /api/oauth/google
 * Direct redirect to Google OAuth (for simple button click)
 */
router.get('/google', (req, res) => {
    try {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

        // Check if OAuth is configured
        if (!clientId || !clientSecret || !redirectUri) {
            console.log('⚠️ [OAUTH] Google OAuth not configured');
            return res.redirect('/login.html?error=google_not_configured');
        }

        const authUrl = oauth.getGoogleAuthUrl();
        console.log('[OAUTH] Redirecting to Google:', authUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error('[OAUTH] Google redirect error:', error.message);
        res.redirect('/login.html?error=google_failed');
    }
});

/**
 * GET /api/oauth/google/auth
 * Redirect to Google OAuth login (JSON response)
 */
router.get('/google/auth', (req, res) => {
    try {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

        // Check if OAuth is configured
        if (!clientId || !clientSecret || !redirectUri) {
            console.log('⚠️ [OAUTH] Google OAuth not configured');
            return res.status(503).json({
                error: 'Google OAuth not configured',
                code: 'OAUTH_NOT_CONFIGURED',
                message: 'Admin must configure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI',
                hint: 'Use email/password login for now'
            });
        }

        const authUrl = oauth.getGoogleAuthUrl();
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('[OAUTH] Google auth error:', error.message);
        res.status(500).json({ error: 'Failed to initiate Google OAuth', details: error.message });
    }
});

/**
 * POST /api/oauth/google/callback
 * Handle Google OAuth callback
 */
router.post('/google/callback', async (req, res) => {
    try {
        const { code, idToken } = req.body;
        
        if (!code && !idToken) {
            return res.status(400).json({ error: 'Code or idToken required' });
        }
        
        let googleUser;
        
        // Verify ID token (preferred method)
        if (idToken) {
            try {
                googleUser = await oauth.verifyGoogleIdToken(idToken);
            } catch (error) {
                console.error('[OAUTH] Google ID token verification failed, trying code exchange:', error);
                // Fallback to code exchange if ID token fails
                if (code) {
                    const tokens = await oauth.exchangeGoogleCode(code);
                    googleUser = await oauth.verifyGoogleIdToken(tokens.idToken);
                } else {
                    throw error;
                }
            }
        } else if (code) {
            // Exchange code for tokens
            const tokens = await oauth.exchangeGoogleCode(code);
            googleUser = await oauth.verifyGoogleIdToken(tokens.idToken);
        }
        
        // Look up or create user
        const googleId = googleUser.sub;
        const email = googleUser.email?.toLowerCase();
        
        let user = await db.getUserByEmail(email);
        
        if (!user) {
            // Create new user from Google
            const userId = nanoid();
            const defaultPassword = nanoid(32); // Random password - won't be used
            
            await db.createUser(userId, email, defaultPassword, googleUser.name);
            
            // Update with Google OAuth info
            await db.updateUser(userId, {
                google_id: googleId,
                avatar_url: googleUser.picture,
                email_verified: googleUser.email_verified ? 1 : 0
            });
            
            // Create default agent
            const agentId = nanoid();
            await db.createAgent(agentId, userId, 'Mon Agent');
            
            user = await db.getUserById(userId);
            
            auditLog({
                type: 'user_registered_oauth_google',
                userId,
                email,
                googleId,
                ipAddress: req.ip
            });
        } else {
            // Link Google account to existing user and update avatar
            const updates = {};
            if (!user.google_id) {
                updates.google_id = googleId;
            }
            // Always update avatar from Google (fresh profile pic)
            if (googleUser.picture) {
                updates.avatar_url = googleUser.picture;
            }

            if (Object.keys(updates).length > 0) {
                await db.updateUser(user.id, updates);
                // Refresh user object with updated data
                user = await db.getUserById(user.id);
            }

            auditLog({
                type: 'oauth_google_login',
                userId: user.id,
                email,
                googleId,
                ipAddress: req.ip
            });
        }
        
        // Generate tokens and return
        const tokens = await generateDualTokens(user.id);
        
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 90 * 24 * 60 * 60 * 1000
        });
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('[OAUTH] Google callback error:', error);
        res.status(500).json({ error: 'OAuth authentication failed' });
    }
});

/**
 * GET /api/oauth/github/auth
 * Redirect to GitHub OAuth login
 */
router.get('/github/auth', (req, res) => {
    try {
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
        
        // Check if OAuth is configured
        if (!clientId || !clientSecret || !redirectUri) {
            console.log('⚠️ [OAUTH] GitHub OAuth not configured');
            return res.status(503).json({ 
                error: 'GitHub OAuth not configured',
                code: 'OAUTH_NOT_CONFIGURED',
                message: 'Admin must configure GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, and GITHUB_OAUTH_REDIRECT_URI',
                hint: 'Use email/password login for now'
            });
        }
        
        const authUrl = oauth.getGithubAuthUrl();
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('[OAUTH] GitHub auth error:', error.message);
        res.status(500).json({ error: 'Failed to initiate GitHub OAuth', details: error.message });
    }
});

/**
 * POST /api/oauth/github/callback
 * Handle GitHub OAuth callback
 */
router.post('/github/callback', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code required' });
        }
        
        // Exchange code for access token
        const tokenResult = await oauth.exchangeGithubCode(code);
        const accessToken = tokenResult.accessToken;
        
        // Get user info from GitHub
        const githubUser = await oauth.getGithubUserInfo(accessToken);
        
        // Get primary email
        let email = githubUser.email;
        if (!email) {
            // Fetch user emails if not in main response
            const emails = await oauth.getGithubUserEmails(accessToken);
            const primaryEmail = emails.find(e => e.primary);
            email = primaryEmail?.email || emails[0]?.email;
        }
        
        if (!email) {
            return res.status(400).json({ 
                error: 'No email available',
                message: 'Please set a public email on your GitHub profile'
            });
        }
        
        email = email.toLowerCase();
        const githubId = githubUser.id;
        
        // Look up or create user
        let user = await db.getUserByEmail(email);
        
        if (!user) {
            // Create new user from GitHub
            const userId = nanoid();
            const defaultPassword = nanoid(32); // Random password
            
            await db.createUser(userId, email, defaultPassword, githubUser.name || githubUser.login);
            
            // Update with GitHub OAuth info
            await db.updateUser(userId, {
                github_id: githubId,
                github_username: githubUser.login,
                avatar_url: githubUser.avatar_url,
                email_verified: 1 // GitHub email is verified
            });
            
            // Create default agent
            const agentId = nanoid();
            await db.createAgent(agentId, userId, 'Mon Agent');
            
            user = await db.getUserById(userId);
            
            auditLog({
                type: 'user_registered_oauth_github',
                userId,
                email,
                githubId,
                githubUsername: githubUser.login,
                ipAddress: req.ip
            });
        } else {
            // Link GitHub account to existing user
            if (!user.github_id) {
                await db.updateUser(user.id, {
                    github_id: githubId,
                    github_username: githubUser.login
                });
            }
            
            auditLog({
                type: 'oauth_github_login',
                userId: user.id,
                email,
                githubId,
                ipAddress: req.ip
            });
        }
        
        // Generate tokens and return
        const tokens = await generateDualTokens(user.id);
        
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 90 * 24 * 60 * 60 * 1000
        });
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('[OAUTH] GitHub callback error:', error);
        res.status(500).json({ error: 'OAuth authentication failed' });
    }
});

// ==========================================
// SERVICE OAUTH (Gmail, Calendar, Drive)
// ==========================================

/**
 * GET /api/oauth/services/google/authorize
 * Start service OAuth flow (Gmail, Calendar, Drive)
 * Query params: service (gmail|calendar|drive)
 */
router.get('/services/google/authorize', authMiddleware, (req, res) => {
    try {
        const { service } = req.query;
        const userId = req.user.id;

        if (!service || !['gmail', 'calendar', 'drive'].includes(service)) {
            return res.status(400).json({ error: 'Invalid service. Must be gmail, calendar, or drive' });
        }

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(503).json({
                error: 'Google OAuth not configured',
                code: 'OAUTH_NOT_CONFIGURED'
            });
        }

        // Callback URI for service OAuth
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUri = `${baseUrl}/api/oauth/services/google/callback`;

        const authUrl = oauth.getGoogleServiceAuthUrl(service, userId, redirectUri);
        console.log(`[OAUTH] Service auth URL for ${service}:`, authUrl);

        // Redirect directly or return URL
        if (req.query.redirect === 'true') {
            res.redirect(authUrl);
        } else {
            res.json({ success: true, url: authUrl, service });
        }
    } catch (error) {
        console.error('[OAUTH] Service auth error:', error.message);
        res.status(500).json({ error: 'Failed to initiate service OAuth', details: error.message });
    }
});

/**
 * GET /api/oauth/services/google/callback
 * Handle service OAuth callback
 */
router.get('/services/google/callback', async (req, res) => {
    try {
        const { code, state, error: oauthError } = req.query;

        if (oauthError) {
            console.error('[OAUTH] Service callback error:', oauthError);
            return res.redirect('/dashboard.html?oauth_error=' + encodeURIComponent(oauthError));
        }

        if (!code || !state) {
            return res.redirect('/dashboard.html?oauth_error=missing_params');
        }

        // Decode state
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        } catch (e) {
            return res.redirect('/dashboard.html?oauth_error=invalid_state');
        }

        const { service, userId } = stateData;

        // Verify user exists
        const user = await db.getUserById(userId);
        if (!user) {
            return res.redirect('/dashboard.html?oauth_error=user_not_found');
        }

        // Exchange code for tokens
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const redirectUri = `${baseUrl}/api/oauth/services/google/callback`;

        const tokens = await oauth.exchangeGoogleServiceCode(code, redirectUri);

        // Get user's email from ID token
        const googleUser = await oauth.getGoogleUserFromIdToken(tokens.idToken);
        const email = googleUser.email;

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        // Store integration in database
        const integrationId = nanoid();
        const scopes = oauth.SERVICE_SCOPES[service].join(' ');

        await db.saveUserIntegration(
            integrationId,
            userId,
            service,
            email,
            tokens.accessToken,
            tokens.refreshToken,
            expiresAt,
            scopes
        );

        console.log(`[OAUTH] Service ${service} connected for user ${userId} (${email})`);

        auditLog({
            type: 'service_oauth_connected',
            userId,
            service,
            email,
            ipAddress: req.ip
        });

        // Redirect back to dashboard with success
        res.redirect(`/dashboard.html?oauth_success=${service}&email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('[OAUTH] Service callback error:', error);
        res.redirect('/dashboard.html?oauth_error=' + encodeURIComponent(error.message));
    }
});

/**
 * GET /api/oauth/services
 * List user's connected services
 */
router.get('/services', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const integrations = await db.getUserIntegrations(userId);

        res.json({
            success: true,
            integrations: integrations.map(i => ({
                service: i.service,
                email: i.email,
                connected_at: i.connected_at,
                last_used: i.last_used
            }))
        });
    } catch (error) {
        console.error('[OAUTH] List services error:', error);
        res.status(500).json({ error: 'Failed to list services' });
    }
});

/**
 * DELETE /api/oauth/services/:service/:email
 * Disconnect a service integration
 */
router.delete('/services/:service/:email', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { service, email } = req.params;

        await db.deleteUserIntegration(userId, service, email);

        auditLog({
            type: 'service_oauth_disconnected',
            userId,
            service,
            email,
            ipAddress: req.ip
        });

        res.json({ success: true, message: `${service} disconnected for ${email}` });
    } catch (error) {
        console.error('[OAUTH] Disconnect service error:', error);
        res.status(500).json({ error: 'Failed to disconnect service' });
    }
});

/**
 * POST /api/oauth/unlink
 * Unlink OAuth account from user
 */
router.post('/unlink', authMiddleware, async (req, res) => {
    try {
        const { provider } = req.body; // 'google' or 'github'
        const userId = req.user.id;
        
        if (!provider || !['google', 'github'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }
        
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user has password (can't unlink if using OAuth as sole login method)
        if (!user.password_hash) {
            return res.status(400).json({ 
                error: 'Cannot unlink',
                message: 'Set a password first before unlinking OAuth'
            });
        }
        
        if (provider === 'google') {
            await db.updateUser(userId, { google_id: null });
        } else if (provider === 'github') {
            await db.updateUser(userId, { 
                github_id: null,
                github_username: null
            });
        }
        
        auditLog({
            type: 'oauth_unlinked',
            userId,
            provider,
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: `${provider} account unlinked` });
    } catch (error) {
        console.error('[OAUTH] Unlink error:', error);
        res.status(500).json({ error: 'Failed to unlink account' });
    }
});

module.exports = router;
