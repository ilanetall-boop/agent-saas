/**
 * Token Encryption Service
 * Encrypts/decrypts sensitive tokens with AES-256-GCM
 * Prevents token theft if database is compromised
 */

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be set and at least 32 characters (256 bits)');
}

/**
 * Encrypt a token for storage in database
 * @param {string} token - The token to encrypt
 * @returns {string} - Encrypted token with IV and auth tag
 */
function encryptToken(token) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a token from database
 * @param {string} encryptedToken - Encrypted token (format: iv:authTag:encrypted)
 * @returns {string} - Decrypted token
 */
function decryptToken(encryptedToken) {
    try {
        const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
        
        if (!ivHex || !authTagHex || !encrypted) {
            throw new Error('Invalid encrypted token format');
        }
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error(`Token decryption failed: ${error.message}`);
    }
}

/**
 * Generate encryption key from password/entropy
 * Use this ONCE to create your TOKEN_ENCRYPTION_KEY
 * @returns {string} - 64-char hex string for TOKEN_ENCRYPTION_KEY env var
 */
function generateEncryptionKey() {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString('hex');
}

module.exports = {
    encryptToken,
    decryptToken,
    generateEncryptionKey
};
