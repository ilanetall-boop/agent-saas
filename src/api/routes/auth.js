const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateDualTokens, refreshAccessToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register (Dual-Token)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        
        // Check if user exists
        const existing = db.getUserByEmail(email.toLowerCase());
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = nanoid();
        db.createUser(userId, email.toLowerCase(), passwordHash, name || null);
        
        // Create default agent for user
        const agentId = nanoid();
        db.createAgent(agentId, userId, 'Mon Agent');
        
        // Generate dual tokens (access + refresh)
        const tokens = generateDualTokens(userId);
        
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
            refreshToken: tokens.refreshToken, // Also send in body for mobile apps
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
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        
        // Find user
        const user = db.getUserByEmail(email.toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Generate dual tokens
        const tokens = generateDualTokens(user.id);
        
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
            refreshToken: tokens.refreshToken, // Also send in body for mobile apps
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
router.post('/refresh', async (req, res) => {
    try {
        // Get refresh token from body or cookie
        const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token manquant' });
        }
        
        // Validate and generate new access token
        const tokens = await refreshAccessToken(refreshToken);
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn
        });
    } catch (error) {
        console.error('Refresh error:', error);
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
        
        // Clear cookie
        res.clearCookie('refreshToken');
        
        res.json({ success: true, message: 'Déconnecté avec succès' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

module.exports = router;
