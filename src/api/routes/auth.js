const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('../db/db');
const { generateDualTokens, refreshAccessToken, authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { log: auditLog } = require('../services/audit-log');
const { verifyRefreshToken, shouldRotate, rotateToken, getRotationStatus } = require('../services/jwt-rotation');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/email');

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
        
        // Generate verification token and send verification email
        const verificationToken = nanoid(32);
        await db.setEmailVerificationToken(userId, verificationToken);
        const emailResult = await sendVerificationEmail(email.toLowerCase(), verificationToken);
        
        // Log registration
        auditLog({
            type: 'user_registered',
            userId,
            email: email.toLowerCase(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            emailSent: emailResult.success
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
                plan: 'free',
                emailVerified: false
            },
            agent: {
                id: agentId,
                name: 'Mon Agent'
            },
            message: emailResult.success 
                ? 'Account created. Verification email sent.' 
                : 'Account created. Check your email to verify your address.'
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

// Refresh Access Token (with automatic token rotation)
router.post('/refresh', validateRequest(schemas.refresh), async (req, res) => {
    try {
        // Get refresh token from body or cookie
        const refreshToken = req.validatedBody.refreshToken || req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token manquant' });
        }
        
        // Validate refresh token structure
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            auditLog({
                type: 'token_refresh_failed',
                reason: 'invalid_token_structure',
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
            return res.status(401).json({ error: error.message });
        }
        
        const userId = decoded.userId;
        
        // Check if token should be rotated (sliding window)
        const shouldRotateToken = shouldRotate(decoded);
        
        if (shouldRotateToken) {
            // Perform automatic token rotation
            try {
                const rotationResult = await rotateToken(db, userId, refreshToken, decoded);
                
                // Generate new access token
                const tokens = await refreshAccessToken(refreshToken);
                
                // Set new refresh token in cookie
                res.cookie('refreshToken', rotationResult.newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
                });
                
                auditLog({
                    type: 'token_rotated',
                    userId,
                    generation: rotationResult.generation,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent')
                });
                
                return res.json({
                    success: true,
                    accessToken: tokens.accessToken,
                    refreshToken: rotationResult.newToken, // Send new refresh token in body (also in cookie)
                    expiresIn: tokens.expiresIn,
                    rotated: true,
                    generation: rotationResult.generation
                });
            } catch (rotationError) {
                console.error('Token rotation error:', rotationError);
                auditLog({
                    type: 'token_rotation_failed',
                    userId,
                    reason: rotationError.message,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent')
                });
                return res.status(401).json({ error: 'Token rotation failed' });
            }
        }
        
        // Normal refresh (no rotation needed yet)
        const tokens = await refreshAccessToken(refreshToken);
        
        auditLog({
            type: 'token_refreshed',
            userId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
            rotated: false
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

// Token rotation status (monitoring endpoint)
router.get('/rotation-status', authMiddleware, async (req, res) => {
    try {
        const status = await getRotationStatus(db, req.user.id);
        
        res.json({
            success: true,
            rotationStatus: status,
            userId: req.user.id,
            message: status.needsRotation ? 'Token requires rotation' : 'Token is current'
        });
    } catch (error) {
        console.error('Rotation status error:', error);
        res.status(500).json({ error: 'Failed to get rotation status' });
    }
});

// ========== EMAIL VERIFICATION (Phase 1) ==========

// Send verification email
router.post('/send-verification', authMiddleware, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if already verified
        if (user.email_verified) {
            return res.json({ success: true, message: 'Email already verified' });
        }
        
        // Generate verification token
        const verificationToken = nanoid(32);
        await db.setEmailVerificationToken(req.user.id, verificationToken);
        
        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, verificationToken);
        
        if (!emailResult.success) {
            console.error(`[EMAIL] Failed to send verification email to ${user.email}:`, emailResult.error);
            // Don't fail the request, just notify that email couldn't be sent
            return res.status(500).json({ 
                error: 'Failed to send verification email',
                message: 'Please check your email configuration'
            });
        }
        
        auditLog({
            type: 'verification_email_sent',
            userId: req.user.id,
            email: user.email,
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        const user = await db.getUserByEmail(email.toLowerCase());
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if already verified
        if (user.email_verified) {
            return res.json({ success: true, message: 'Email already verified' });
        }
        
        // Generate new verification token
        const verificationToken = nanoid(32);
        await db.setEmailVerificationToken(user.id, verificationToken);
        
        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, verificationToken);
        
        if (!emailResult.success) {
            console.error(`[EMAIL] Failed to resend verification email to ${user.email}:`, emailResult.error);
            return res.status(500).json({ 
                error: 'Failed to send verification email',
                message: 'Please check your email configuration'
            });
        }
        
        auditLog({
            type: 'verification_email_resent',
            userId: user.id,
            email: user.email,
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Verify email with token
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Verification token required' });
        }
        
        const verified = await db.verifyEmail(token);
        if (!verified) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        
        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Verify access token (check if token is valid and get user info)
router.get('/verify-token', authMiddleware, async (req, res) => {
    try {
        // authMiddleware already verified the token and attached userId
        const userId = req.userId;
        
        // Fetch user from database
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.email_verified,
                plan: user.plan || 'free'
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(401).json({ error: 'Token verification failed' });
    }
});

// ========== OAUTH STUBS (Phase 1 - Placeholder) ==========

// Google OAuth login (placeholder)
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // TODO: Verify Google ID token
        // For now, return placeholder response
        res.status(501).json({
            error: 'Google OAuth not yet configured',
            message: 'Use email/password login for now'
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google auth failed' });
    }
});

// GitHub OAuth login (placeholder)
router.post('/github', async (req, res) => {
    try {
        const { code } = req.body;
        
        // TODO: Exchange code for GitHub token
        // TODO: Get user info from GitHub
        // For now, return placeholder response
        res.status(501).json({
            error: 'GitHub OAuth not yet configured',
            message: 'Use email/password login for now'
        });
    } catch (error) {
        console.error('GitHub auth error:', error);
        res.status(500).json({ error: 'GitHub auth failed' });
    }
});

module.exports = router;
