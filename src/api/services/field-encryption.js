/**
 * Field Encryption Service
 * Encrypts/decrypts sensitive user fields at rest
 * Uses AES-256-GCM for transparent encryption
 */

const crypto = require('crypto');

const FIELD_KEY = process.env.FIELD_ENCRYPTION_KEY;

/**
 * Encrypt a field value for storage in database
 * @param {string} value - The field value to encrypt
 * @returns {string} - Encrypted value (format: iv:authTag:encrypted)
 */
function encryptField(value) {
    if (!value) return null; // Don't encrypt null/undefined
    
    if (!FIELD_KEY || FIELD_KEY.length < 32) {
        throw new Error('FIELD_ENCRYPTION_KEY not set or too short');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(FIELD_KEY, 'hex'), iv);

    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a field value from database
 * @param {string} encryptedValue - Encrypted value (format: iv:authTag:encrypted)
 * @returns {string|null} - Decrypted field value or null if decrypt fails
 */
function decryptField(encryptedValue) {
    if (!encryptedValue) return null;
    
    if (!FIELD_KEY) {
        throw new Error('FIELD_ENCRYPTION_KEY not set');
    }

    try {
        const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');

        if (!ivHex || !authTagHex || !encrypted) {
            return encryptedValue; // Return as-is if not encrypted format (for migration)
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(FIELD_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.warn(`Field decryption failed: ${error.message}`);
        return null; // Fail silently, return null
    }
}

/**
 * Encrypt multiple user fields at once
 * @param {object} user - User object with fields to encrypt
 * @returns {object} - User object with encrypted fields
 */
function encryptUserFields(user) {
    if (!user) return user;

    return {
        ...user,
        name: user.name ? encryptField(user.name) : user.name,
        // email: user.email ? encryptField(user.email) : user.email, // Optional
    };
}

/**
 * Decrypt multiple user fields at once
 * @param {object} user - User object with encrypted fields
 * @returns {object} - User object with decrypted fields
 */
function decryptUserFields(user) {
    if (!user) return user;

    return {
        ...user,
        name: user.name ? decryptField(user.name) : user.name,
        // email: user.email ? decryptField(user.email) : user.email, // Optional
    };
}

/**
 * Generate encryption key for sensitive fields
 * Use this ONCE to create your FIELD_ENCRYPTION_KEY
 * @returns {string} - 64-char hex string for FIELD_ENCRYPTION_KEY env var
 */
function generateEncryptionKey() {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString('hex');
}

module.exports = {
    encryptField,
    decryptField,
    encryptUserFields,
    decryptUserFields,
    generateEncryptionKey
};
