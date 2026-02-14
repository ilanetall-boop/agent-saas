const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const config = require('../config');
const db = require('../db/db');

const ACCESS_TOKEN_EXPIRY = '30m'; // 30 minutes
const REFRESH_TOKEN_EXPIRY = 7776000; // 90 days in seconds

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await db.getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        // ✅ NEW: Check if token rotation is needed (30-day max)
        const lastRotation = await db.getLastTokenRotation(decoded.userId);
        if (lastRotation) {
            const daysSinceRotation = (Date.now() - new Date(lastRotation).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceRotation > 30) {
                // Token needs rotation
                return res.status(401).json({ 
                    error: 'Token expired - please refresh',
                    code: 'TOKEN_ROTATION_REQUIRED'
                });
            }
        }
        
        req.user = user;
        req.userId = decoded.userId;
        req.token = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
}

async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await db.getUserById(decoded.userId);
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Ignore invalid tokens for optional auth
    }
    
    next();
}

// Legacy: single token (for backward compatibility)
function generateToken(userId) {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// NEW: Generate dual tokens (access + refresh)
async function generateDualTokens(userId) {
    // Access token: 30 minutes (short-lived, secure)
    const accessToken = jwt.sign(
        { userId, type: 'access' },
        config.jwtSecret,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // Refresh token: 90 days (long-lived, stored in cookie)
    const refreshTokenId = nanoid();
    const refreshToken = jwt.sign(
        { userId, tokenId: refreshTokenId, type: 'refresh' },
        config.jwtSecret,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    // Calculate expiry time for database (as ISO string)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + REFRESH_TOKEN_EXPIRY);
    
    // Store refresh token in database
    await db.saveRefreshToken(userId, refreshToken, expiresAt.toISOString());
    
    return {
        accessToken,
        refreshToken,
        expiresIn: 1800 // 30 minutes in seconds
    };
}

// Verify refresh token and generate new access token
async function refreshAccessToken(refreshToken) {
    try {
        // Verify refresh token signature
        const decoded = jwt.verify(refreshToken, config.jwtSecret);
        
        if (decoded.type !== 'refresh') {
            throw new Error('Type token invalide');
        }
        
        // Check if refresh token exists in database
        const storedToken = await db.getRefreshToken(decoded.userId);
        if (!storedToken || storedToken.token !== refreshToken) {
            throw new Error('Refresh token révoqué');
        }
        
        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: decoded.userId, type: 'access' },
            config.jwtSecret,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
        
        return {
            accessToken: newAccessToken,
            expiresIn: 1800 // 30 minutes
        };
    } catch (error) {
        console.error('Refresh token error:', error.message);
        throw new Error('Refresh échoué: ' + error.message);
    }
}

module.exports = { 
    authMiddleware, 
    optionalAuth, 
    generateToken,
    generateDualTokens,
    refreshAccessToken
};
