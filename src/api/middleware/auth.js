const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/db');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = db.getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide' });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = db.getUserById(decoded.userId);
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Ignore invalid tokens for optional auth
    }
    
    next();
}

function generateToken(userId) {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = { authMiddleware, optionalAuth, generateToken };
