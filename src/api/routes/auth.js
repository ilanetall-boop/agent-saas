const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register
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
        
        // Generate token
        const token = generateToken(userId);
        
        res.status(201).json({
            success: true,
            token,
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

// Login
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
        
        // Generate token
        const token = generateToken(user.id);
        
        res.json({
            success: true,
            token,
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

module.exports = router;
