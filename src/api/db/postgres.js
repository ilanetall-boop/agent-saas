// PostgreSQL Database Module
// Remplace sql.js par une vraie DB pour scalabilité

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection pool (reuse connections)
const pool = new Pool({
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'agent_saas',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    max: 10, // Max connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Initialize database
async function initDb() {
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected');
        
        // Run schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const statements = schema.split(';').filter(s => s.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await client.query(statement);
            }
        }
        
        client.release();
        console.log('✅ Database schema initialized');
        
        return pool;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Query helpers
async function run(sql, params = []) {
    try {
        await pool.query(sql, params);
    } catch (error) {
        console.error('Database error (run):', error);
        throw error;
    }
}

async function get(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Database error (get):', error);
        throw error;
    }
}

async function all(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('Database error (all):', error);
        throw error;
    }
}

// Database operations
const dbOps = {
    // Users
    createUser: async (id, email, passwordHash, name) => {
        return run(
            'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
            [id, email, passwordHash, name]
        );
    },
    
    getUserByEmail: async (email) => {
        return get('SELECT * FROM users WHERE email = $1', [email]);
    },
    
    getUserById: async (id) => {
        return get('SELECT * FROM users WHERE id = $1', [id]);
    },
    
    updateUserMessages: async (id) => {
        return run(
            'UPDATE users SET messages_used = messages_used + 1, updated_at = NOW() WHERE id = $1',
            [id]
        );
    },
    
    // Agents
    createAgent: async (id, userId, name) => {
        return run(
            'INSERT INTO agents (id, user_id, name) VALUES ($1, $2, $3)',
            [id, userId, name]
        );
    },
    
    getAgentByUserId: async (userId) => {
        return get('SELECT * FROM agents WHERE user_id = $1', [userId]);
    },
    
    getAgentByTelegramChat: async (chatId) => {
        return get(`
            SELECT a.*, u.messages_used, u.messages_limit, u.plan 
            FROM agents a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.telegram_chat_id = $1
        `, [chatId]);
    },
    
    updateAgentTelegram: async (agentId, botToken, chatId) => {
        return run(
            'UPDATE agents SET telegram_bot_token = $1, telegram_chat_id = $2 WHERE id = $3',
            [botToken, chatId, agentId]
        );
    },
    
    updateAgentOnboarding: async (agentId) => {
        return run('UPDATE agents SET onboarding_complete = true WHERE id = $1', [agentId]);
    },
    
    // Memories
    setMemory: async (id, agentId, key, value) => {
        return run(`
            INSERT INTO memories (id, agent_id, key, value) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(agent_id, key) 
            DO UPDATE SET value = $4, updated_at = NOW()
        `, [id, agentId, key, value]);
    },
    
    getMemory: async (agentId, key) => {
        const row = await get(
            'SELECT value FROM memories WHERE agent_id = $1 AND key = $2',
            [agentId, key]
        );
        return row ? row.value : null;
    },
    
    getAllMemories: async (agentId) => {
        return all('SELECT key, value FROM memories WHERE agent_id = $1', [agentId]);
    },
    
    // Conversations
    createConversation: async (id, agentId, channel) => {
        return run(
            'INSERT INTO conversations (id, agent_id, channel) VALUES ($1, $2, $3)',
            [id, agentId, channel]
        );
    },
    
    getActiveConversation: async (agentId) => {
        return get(
            'SELECT * FROM conversations WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1',
            [agentId]
        );
    },
    
    // Messages
    addMessage: async (id, conversationId, role, content) => {
        return run(
            'INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)',
            [id, conversationId, role, content]
        );
    },
    
    getMessages: async (conversationId, limit) => {
        return all(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
            [conversationId, limit]
        );
    },
    
    getRecentMessages: async (conversationId, limit) => {
        return all(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
            [conversationId, limit]
        );
    },
    
    // Refresh tokens (new)
    saveRefreshToken: async (userId, token, expiresAt) => {
        return run(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) 
             VALUES ($1, $2, $3)
             ON CONFLICT(user_id) DO UPDATE SET token = $2, expires_at = $3`,
            [userId, token, expiresAt]
        );
    },
    
    getRefreshToken: async (userId) => {
        return get(
            'SELECT token FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
            [userId]
        );
    },
    
    deleteRefreshToken: async (userId) => {
        return run('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await pool.end();
    process.exit(0);
});

module.exports = { initDb, ...dbOps };
