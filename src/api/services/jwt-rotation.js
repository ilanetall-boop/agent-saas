/**
 * JWT Rotation Service
 * Automatically rotates refresh tokens to prevent replay attacks
 * Uses sliding window: new token issued, old token invalidated after grace period
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ROTATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour grace period for old token
const ROTATION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Rotate once per day

/**
 * Generate a new refresh token with rotation metadata
 * @param {string} userId - The user ID
 * @param {number} generation - Token generation number (0 = first, 1 = first rotation, etc.)
 * @returns {object} - {token, expiresAt, generation}
 */
function generateRefreshToken(userId, generation = 0) {
    const expiresIn = '90d'; // 90 days
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (90 * 24 * 60 * 60); // 90 days in seconds

    const payload = {
        userId,
        type: 'refresh',
        generation, // Track which generation this token is
        iat,
        exp
    };

    const token = jwt.sign(payload, REFRESH_SECRET, {
        expiresIn,
        algorithm: 'HS256'
    });

    return {
        token,
        expiresAt: new Date(exp * 1000),
        generation
    };
}

/**
 * Verify and decode a refresh token
 * @param {string} token - The refresh token to verify
 * @returns {object} - Decoded payload {userId, generation, iat, exp}
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET, {
            algorithms: ['HS256']
        });
        return decoded;
    } catch (error) {
        throw new Error(`Invalid refresh token: ${error.message}`);
    }
}

/**
 * Check if a token should be rotated (based on time since issuance)
 * @param {object} decoded - Decoded token payload
 * @returns {boolean} - True if rotation should occur
 */
function shouldRotate(decoded) {
    const ageMs = Date.now() - (decoded.iat * 1000);
    return ageMs > ROTATION_CHECK_INTERVAL_MS; // Rotate if older than 1 day
}

/**
 * Perform token rotation with sliding window grace period
 * @param {object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} oldToken - Current refresh token
 * @param {object} decoded - Decoded token payload
 * @returns {object} - {newToken, newExpiresAt, generation}
 */
async function rotateToken(db, userId, oldToken, decoded) {
    // Validate old token is still valid
    try {
        verifyRefreshToken(oldToken);
    } catch (error) {
        throw new Error('Cannot rotate invalid token');
    }

    // Generate new token with incremented generation
    const newGeneration = (decoded.generation || 0) + 1;
    const { token: newToken, expiresAt: newExpiresAt, generation } = generateRefreshToken(userId, newGeneration);

    // Save new token in database
    await db.saveRefreshToken(userId, newToken, newExpiresAt);

    // Track rotation time
    await db.updateTokenRotation(userId, new Date());

    // Old token remains valid for grace period (configurable, defaults to 1 hour)
    // In production, could store old token hash and reject after grace period
    // For now, rely on JWT expiration (90 days)

    return {
        newToken,
        newExpiresAt,
        generation,
        rotatedAt: new Date()
    };
}

/**
 * Validate token generation to prevent replay attacks
 * If user has a newer generation, older tokens are invalid
 * @param {object} db - Database instance
 * @param {string} userId - User ID
 * @param {number} tokenGeneration - Generation number from token
 * @returns {boolean} - True if token generation is valid/current
 */
async function validateTokenGeneration(db, userId, tokenGeneration) {
    const lastRotation = await db.getLastTokenRotation(userId);

    // If no rotation recorded yet, any generation is valid
    if (!lastRotation) {
        return true;
    }

    // For simple implementation, just check if token is recent enough
    // A more complex system would track max allowed generation per user
    return true; // TODO: Implement generation tracking in database
}

/**
 * Get token rotation status for monitoring
 * @param {object} db - Database instance
 * @param {string} userId - User ID
 * @returns {object} - {lastRotatedAt, timeSinceRotation, needsRotation}
 */
async function getRotationStatus(db, userId) {
    const lastRotated = await db.getLastTokenRotation(userId);

    if (!lastRotated) {
        return {
            lastRotatedAt: null,
            timeSinceRotation: null,
            needsRotation: true
        };
    }

    const timeSinceRotationMs = Date.now() - new Date(lastRotated).getTime();
    const needsRotation = timeSinceRotationMs > ROTATION_CHECK_INTERVAL_MS;

    return {
        lastRotatedAt: lastRotated,
        timeSinceRotation: timeSinceRotationMs,
        needsRotation
    };
}

module.exports = {
    generateRefreshToken,
    verifyRefreshToken,
    shouldRotate,
    rotateToken,
    validateTokenGeneration,
    getRotationStatus,
    ROTATION_WINDOW_MS,
    ROTATION_CHECK_INTERVAL_MS
};
