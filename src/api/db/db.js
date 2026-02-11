const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { encryptToken, decryptToken } = require('../services/token-encryption');

let pool = null;

// Initialize PostgreSQL connection pool
async function initDb() {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable not set. PostgreSQL required for production.');
    }
    
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: true, // ✅ FIXED: Validate server certificate
            ca: process.env.RENDER_CA_CERT // Optional: Use Render's CA cert if provided
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    });

    // Test connection
    try {
        const client = await pool.connect();
        console.log('PostgreSQL connection successful');
        
        // Create schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema-postgres.sql'), 'utf8');
        
        // Split schema into individual statements and execute each
        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await client.query(statement);
            }
        }
        
        console.log('Database schema initialized');
        client.release();
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
    
    return pool;
}

// Helper to run queries (no save needed for PostgreSQL)
async function run(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    try {
        return await pool.query(sql, params);
    } catch (error) {
        console.error('Database error:', error.message);
        throw error;
    }
}

async function get(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}

async function all(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    const result = await pool.query(sql, params);
    return result.rows;
}

// Database operations (PostgreSQL syntax)
const dbOps = {
    // Users
    createUser: async (id, email, passwordHash, name) => {
        await run(
            'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
            [id, email, passwordHash, name]
        );
    },
    
    getUserByEmail: async (email) => {
        return await get('SELECT * FROM users WHERE email = $1', [email]);
    },
    
    getUserById: async (id) => {
        return await get('SELECT * FROM users WHERE id = $1', [id]);
    },
    
    updateUserMessages: async (id) => {
        await run(
            'UPDATE users SET messages_used = messages_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    },
    
    // Agents
    createAgent: async (id, userId, name) => {
        await run(
            'INSERT INTO agents (id, user_id, name) VALUES ($1, $2, $3)',
            [id, userId, name]
        );
    },
    
    getAgentByUserId: async (userId) => {
        return await get('SELECT * FROM agents WHERE user_id = $1', [userId]);
    },
    
    getAgentByTelegramChat: async (chatId) => {
        return await get(`
            SELECT a.*, u.messages_used, u.messages_limit, u.plan 
            FROM agents a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.telegram_chat_id = $1
        `, [chatId]);
    },
    
    updateAgentTelegram: async (agentId, botToken, chatId) => {
        await run(
            'UPDATE agents SET telegram_bot_token = $1, telegram_chat_id = $2 WHERE id = $3',
            [botToken, chatId, agentId]
        );
    },
    
    updateAgentOnboarding: async (agentId) => {
        await run('UPDATE agents SET onboarding_complete = 1 WHERE id = $1', [agentId]);
    },
    
    // Memories
    setMemory: async (id, agentId, key, value) => {
        // PostgreSQL UPSERT syntax
        await run(`
            INSERT INTO memories (id, agent_id, key, value) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(agent_id, key) DO UPDATE 
            SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `, [id, agentId, key, value]);
    },
    
    getMemory: async (agentId, key) => {
        const row = await get('SELECT value FROM memories WHERE agent_id = $1 AND key = $2', [agentId, key]);
        return row ? row.value : null;
    },
    
    getAllMemories: async (agentId) => {
        return await all('SELECT key, value FROM memories WHERE agent_id = $1', [agentId]);
    },
    
    // Conversations
    createConversation: async (id, agentId, channel) => {
        await run(
            'INSERT INTO conversations (id, agent_id, channel) VALUES ($1, $2, $3)',
            [id, agentId, channel]
        );
    },
    
    getActiveConversation: async (agentId) => {
        return await get(
            'SELECT * FROM conversations WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
            [agentId]
        );
    },
    
    // Messages
    addMessage: async (id, conversationId, role, content) => {
        await run(
            'INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)',
            [id, conversationId, role, content]
        );
    },
    
    getMessages: async (conversationId, limit) => {
        return await all(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
            [conversationId, limit]
        );
    },
    
    getRecentMessages: async (conversationId, limit) => {
        return await all(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
            [conversationId, limit]
        );
    },
    
    // Refresh Tokens (for dual-token auth) - ENCRYPTED
    saveRefreshToken: async (userId, token, expiresAt) => {
        const tokenId = require('nanoid').nanoid();
        // ✅ ENCRYPTION: Encrypt token before storing
        const encryptedToken = encryptToken(token);
        await run(
            'INSERT INTO sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
            [tokenId, userId, encryptedToken, expiresAt]
        );
    },
    
    getRefreshToken: async (userId) => {
        const session = await get(
            'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        if (session && session.token) {
            // ✅ DECRYPTION: Decrypt token when retrieving
            try {
                session.token = decryptToken(session.token);
            } catch (error) {
                console.error('Token decryption failed:', error.message);
                return null; // Invalid token, return null
            }
        }
        
        return session;
    },
    
    deleteRefreshToken: async (userId) => {
        await run('DELETE FROM sessions WHERE user_id = $1', [userId]);
    },
    
    // Audit logging (Phase 3a)
    logAudit: async (id, action, userId, details, ipAddress, userAgent, status, errorMessage) => {
        await run(`
            INSERT INTO audit_logs (id, action, user_id, details, ip_address, user_agent, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, action, userId, details, ipAddress, userAgent, status, errorMessage]);
    },
    
    getAuditLogs: async (limit = 100, offset = 0) => {
        return await all(
            'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
    },
    
    getAuditStats: async () => {
        return await get(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                   COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
            FROM audit_logs
        `);
    },
    
    // Vault operations (for encrypted API keys)
    storeVaultKey: async (id, keyName, encryptedValue) => {
        await run(`
            INSERT INTO vaults (id, key_name, value)
            VALUES ($1, $2, $3)
            ON CONFLICT(key_name) DO UPDATE
            SET value = EXCLUDED.value, encrypted_at = CURRENT_TIMESTAMP
        `, [id, keyName, encryptedValue]);
    },
    
    getVaultKey: async (keyName) => {
        return await get('SELECT * FROM vaults WHERE key_name = $1', [keyName]);
    },
    
    deleteVaultKey: async (keyName) => {
        await run('DELETE FROM vaults WHERE key_name = $1', [keyName]);
    },
    
    // Token rotation tracking
    updateTokenRotation: async (userId, rotatedAt) => {
        await run(
            'UPDATE sessions SET last_rotated_at = $1 WHERE user_id = $2',
            [rotatedAt, userId]
        );
    },
    
    getLastTokenRotation: async (userId) => {
        const result = await get(
            'SELECT last_rotated_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        return result?.last_rotated_at;
    }
};

module.exports = { initDb, ...dbOps };
