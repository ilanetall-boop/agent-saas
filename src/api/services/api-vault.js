/**
 * API Vault Service
 * Securely stores and manages sensitive API keys
 * Keys are encrypted at rest with AES-256-GCM
 */

const crypto = require('crypto');

const MASTER_KEY = process.env.VAULT_MASTER_KEY;

/**
 * Encrypt a secret value for storage
 * @param {string} value - The secret to encrypt
 * @returns {string} - Encrypted value (format: iv:authTag:encrypted)
 */
function encryptSecret(value) {
    if (!MASTER_KEY || MASTER_KEY.length < 32) {
        throw new Error('VAULT_MASTER_KEY not set or too short');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(MASTER_KEY, 'hex'), iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a secret from storage
 * @param {string} encryptedValue - Encrypted value (format: iv:authTag:encrypted)
 * @returns {string} - Decrypted secret
 */
function decryptSecret(encryptedValue) {
    if (!MASTER_KEY) {
        throw new Error('VAULT_MASTER_KEY not set');
    }

    try {
        const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');

        if (!ivHex || !authTagHex || !encrypted) {
            throw new Error('Invalid encrypted secret format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(MASTER_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(`Secret decryption failed: ${error.message}`);
    }
}

/**
 * Store API key in vault
 * @param {object} db - Database instance
 * @param {string} keyName - Unique name for the key (e.g., 'ANTHROPIC_API_KEY')
 * @param {string} keyValue - The API key value
 * @returns {Promise<void>}
 */
async function storeApiKey(db, keyName, keyValue) {
    if (!keyName || !keyValue) {
        throw new Error('keyName and keyValue required');
    }

    const encryptedValue = encryptSecret(keyValue);
    const vaultId = require('nanoid').nanoid();

    await db.storeVaultKey(vaultId, keyName, encryptedValue);
}

/**
 * Retrieve API key from vault
 * @param {object} db - Database instance
 * @param {string} keyName - The key to retrieve
 * @returns {Promise<string>} - Decrypted API key value
 */
async function getApiKey(db, keyName) {
    if (!keyName) {
        throw new Error('keyName required');
    }

    const vaultEntry = await db.getVaultKey(keyName);

    if (!vaultEntry) {
        throw new Error(`API key not found in vault: ${keyName}`);
    }

    return decryptSecret(vaultEntry.value);
}

/**
 * Generate a new vault master key
 * Use this ONCE to create your VAULT_MASTER_KEY
 * @returns {string} - 64-char hex string for VAULT_MASTER_KEY env var
 */
function generateMasterKey() {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString('hex');
}

module.exports = {
    encryptSecret,
    decryptSecret,
    storeApiKey,
    getApiKey,
    generateMasterKey
};
