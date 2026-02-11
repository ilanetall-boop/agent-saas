const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateDualTokens, refreshAccessToken, authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { log: auditLog } = require('../services/audit-log');

const router = express.Router();

// NOTE: Auth endpoints already protected by global limiter in server.js
// No need for additional rate limiting here

// Register (Dual-Token)
router.post('/register', validateRequest(schemas.register), async (req, res) => {
    try {
        const { email, password, name } = req.validatedBody;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        
        // Check if user exists
        const existing = await db.getUserByEmail(email.toLowerCase());
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = nanoid();
        await db.createUser(userId, email.toLowerCase(), passwordHash, name || null);
        
        // Create default agent for user
        const agentId = nanoid();
        await db.createAgent(agentId, userId, 'Mon Agent');
        
        // Log registration
        auditLog({
            type: 'user_registered',
            userId,
            email: email.toLowerCase(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Generate dual tokens (access + refresh)
        const tokens = await generateDualTokens(userId);
        
        // Set refresh token in secure HttpOnly cookie (optional)
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
        });
        
        res.status(201).json({
            success: true,
            accessToken: tokens.accessToken,
            // NOTE: refreshToken is ONLY in secure HttpOnly cookie now, not in body
            // This prevents XSS attacks from stealing the refresh token
            expiresIn: tokens.expiresIn,
            user: {
                id: userId,
                email,
                name,
                plan: 'free'
            },
            agent: {
                id: agentId,
                name: 'Mon Agent'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Login (Dual-Token)
router.post('/login', validateRequest(schemas.login), async (req, res) => {
    try {
        const { email, password } = req.validatedBody;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        
        // Find user
        const user = await db.getUserByEmail(email.toLowerCase());
        if (!user) {
            // Log failed login
            auditLog({
                type: 'login_failed',
                email: email.toLowerCase(),
                reason: 'user_not_found',
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            // Log failed login
            auditLog({
                type: 'login_failed',
                userId: user.id,
                email: email.toLowerCase(),
                reason: 'invalid_password',
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Log successful login
        auditLog({
            type: 'login_success',
            userId: user.id,
            email: email.toLowerCase(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Generate dual tokens
        const tokens = await generateDualTokens(user.id);
        
        // Set refresh token in secure HttpOnly cookie (optional)
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
        });
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            // NOTE: refreshToken is ONLY in secure HttpOnly cookie now, not in body
            // This prevents XSS attacks from stealing the refresh token
            expiresIn: tokens.expiresIn,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                messagesUsed: user.messages_used,
                messagesLimit: user.messages_limit
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Refresh Access Token (NEW)
router.post('/refresh', validateRequest(schemas.refresh), async (req, res) => {
    try {
        // Get refresh token from body or cookie
        const refreshToken = req.validatedBody.refreshToken || req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token manquant' });
        }
        
        // Validate and generate new access token
        const tokens = await refreshAccessToken(refreshToken);
        
        // Log token refresh
        auditLog({
            type: 'token_refreshed',
            userId: tokens.userId || 'unknown',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn
        });
    } catch (error) {
        console.error('Refresh error:', error);
        
        // Log failed refresh
        auditLog({
            type: 'token_refresh_failed',
            reason: error.message,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.status(401).json({ error: error.message });
    }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            plan: req.user.plan,
            messagesUsed: req.user.messages_used,
            messagesLimit: req.user.messages_limit
        }
    });
});

// Logout (revoke refresh token) (NEW)
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // Delete refresh token from database
        await db.deleteRefreshToken(req.user.id);
        
        // Log logout
        auditLog({
            type: 'logout',
            userId: req.user.id,
            email: req.user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Clear cookie
        res.clearCookie('refreshToken');
        
        res.json({ success: true, message: 'Déconnecté avec succès' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

module.exports = router;
