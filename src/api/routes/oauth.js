const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateDualTokens, authMiddleware } = require('../middleware/auth');
const { log: auditLog } = require('../services/audit-log');
const oauth = require('../services/oauth');

const router = express.Router();

/**
 * GET /api/oauth/google/auth
 * Redirect to Google OAuth login
 */
router.get('/google/auth', (req, res) => {
    try {
        const authUrl = oauth.getGoogleAuthUrl();
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('[OAUTH] Google auth error:', error);
        res.status(500).json({ error: 'Failed to initiate Google OAuth' });
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
            // Link Google account to existing user
            if (!user.google_id) {
                await db.updateUser(user.id, {
                    google_id: googleId
                });
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
        const authUrl = oauth.getGithubAuthUrl();
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('[OAUTH] GitHub auth error:', error);
        res.status(500).json({ error: 'Failed to initiate GitHub OAuth' });
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
