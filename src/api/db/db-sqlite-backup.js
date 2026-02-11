const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/agent-saas.db');

let db = null;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
async function initDb() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }
    
    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.run(schema);
    
    // Save to file
    saveDb();
    
    console.log('Database initialized');
    return db;
}

function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 30 seconds
setInterval(saveDb, 30000);

// Helper to run queries
function run(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    db.run(sql, params);
    saveDb();
}

function get(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

function all(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Database operations
const dbOps = {
    // Users
    createUser: (id, email, passwordHash, name) => {
        run('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)', 
            [id, email, passwordHash, name]);
    },
    
    getUserByEmail: (email) => {
        return get('SELECT * FROM users WHERE email = ?', [email]);
    },
    
    getUserById: (id) => {
        return get('SELECT * FROM users WHERE id = ?', [id]);
    },
    
    updateUserMessages: (id) => {
        run('UPDATE users SET messages_used = messages_used + 1, updated_at = datetime("now") WHERE id = ?', [id]);
    },
    
    // Agents
    createAgent: (id, userId, name) => {
        run('INSERT INTO agents (id, user_id, name) VALUES (?, ?, ?)', [id, userId, name]);
    },
    
    getAgentByUserId: (userId) => {
        return get('SELECT * FROM agents WHERE user_id = ?', [userId]);
    },
    
    getAgentByTelegramChat: (chatId) => {
        return get(`
            SELECT a.*, u.messages_used, u.messages_limit, u.plan 
            FROM agents a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.telegram_chat_id = ?
        `, [chatId]);
    },
    
    updateAgentTelegram: (agentId, botToken, chatId) => {
        run('UPDATE agents SET telegram_bot_token = ?, telegram_chat_id = ? WHERE id = ?', 
            [botToken, chatId, agentId]);
    },
    
    updateAgentOnboarding: (agentId) => {
        run('UPDATE agents SET onboarding_complete = 1 WHERE id = ?', [agentId]);
    },
    
    // Memories
    setMemory: (id, agentId, key, value) => {
        run(`INSERT INTO memories (id, agent_id, key, value) VALUES (?, ?, ?, ?)
             ON CONFLICT(agent_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime("now")`,
            [id, agentId, key, value]);
    },
    
    getMemory: (agentId, key) => {
        const row = get('SELECT value FROM memories WHERE agent_id = ? AND key = ?', [agentId, key]);
        return row ? row.value : null;
    },
    
    getAllMemories: (agentId) => {
        return all('SELECT key, value FROM memories WHERE agent_id = ?', [agentId]);
    },
    
    // Conversations
    createConversation: (id, agentId, channel) => {
        run('INSERT INTO conversations (id, agent_id, channel) VALUES (?, ?, ?)', [id, agentId, channel]);
    },
    
    getActiveConversation: (agentId) => {
        return get('SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at DESC LIMIT 1', [agentId]);
    },
    
    // Messages
    addMessage: (id, conversationId, role, content) => {
        run('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)', 
            [id, conversationId, role, content]);
    },
    
    getMessages: (conversationId, limit) => {
        return all('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?', 
            [conversationId, limit]);
    },
    
    getRecentMessages: (conversationId, limit) => {
        return all('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?',
            [conversationId, limit]);
    },
    
    // Refresh Tokens (for dual-token auth)
    saveRefreshToken: (userId, token, expiresAt) => {
        const tokenId = require('nanoid').nanoid();
        run('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
            [tokenId, userId, token, expiresAt]);
    },
    
    getRefreshToken: (userId) => {
        return get('SELECT * FROM sessions WHERE user_id = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1', [userId]);
    },
    
    deleteRefreshToken: (userId) => {
        run('DELETE FROM sessions WHERE user_id = ?', [userId]);
    }
};

module.exports = { initDb, saveDb, ...dbOps };
