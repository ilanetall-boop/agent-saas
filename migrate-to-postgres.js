#!/usr/bin/env node

/**
 * PostgreSQL Migration Script
 * Migrates data from SQLite to PostgreSQL
 * 
 * USAGE:
 * 1. Create PostgreSQL database on Render
 * 2. Set env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
 * 3. Run: node migrate-to-postgres.js
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

async function migrate() {
    try {
        console.log('🚀 Starting PostgreSQL migration...\n');

        // 1. Load SQLite data
        console.log('📖 Step 1: Loading SQLite database...');
        const SQL = await initSqlJs();
        const sqliteFile = path.join(__dirname, 'data/agent-saas.db');
        
        if (!fs.existsSync(sqliteFile)) {
            console.log('   ⚠️  No SQLite database found (first run)');
            console.log('   → Creating new PostgreSQL database...\n');
            await initializePostgreSQL();
            return;
        }

        const buffer = fs.readFileSync(sqliteFile);
        const sqliteDb = new SQL.Database(buffer);
        console.log('   ✅ SQLite loaded\n');

        // 2. Extract data from SQLite
        console.log('📋 Step 2: Extracting data from SQLite...');
        const tables = {
            users: [],
            agents: [],
            memories: [],
            conversations: [],
            messages: [],
            sessions: []
        };

        for (const table of Object.keys(tables)) {
            const stmt = sqliteDb.prepare(`SELECT * FROM ${table}`);
            while (stmt.step()) {
                tables[table].push(stmt.getAsObject());
            }
            stmt.free();
            console.log(`   ✅ ${table}: ${tables[table].length} rows`);
        }
        console.log('');

        // 3. Connect to PostgreSQL
        console.log('🔗 Step 3: Connecting to PostgreSQL...');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            ssl: true // Render requires SSL
        });

        const client = await pool.connect();
        console.log('   ✅ Connected to PostgreSQL\n');

        try {
            // 4. Create tables
            console.log('📊 Step 4: Creating tables...');
            await createTables(client);
            console.log('   ✅ Tables created\n');

            // 5. Migrate data
            console.log('📤 Step 5: Migrating data...');
            for (const [table, rows] of Object.entries(tables)) {
                if (rows.length > 0) {
                    await migrateTable(client, table, rows);
                    console.log(`   ✅ ${table}: ${rows.length} rows migrated`);
                }
            }
            console.log('');

            // 6. Verify
            console.log('✅ Step 6: Verifying migration...');
            for (const table of Object.keys(tables)) {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                const count = result.rows[0].count;
                console.log(`   ✅ ${table}: ${count} rows in PostgreSQL`);
            }
            console.log('');

            console.log('🎉 Migration complete!\n');
            console.log('Next steps:');
            console.log('1. Update environment variables on Render');
            console.log('2. Redeploy application');
            console.log('3. Verify application works with PostgreSQL');

        } finally {
            client.release();
            pool.end();
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function createTables(client) {
    const schema = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            plan TEXT DEFAULT 'free',
            messages_used INTEGER DEFAULT 0,
            messages_limit INTEGER DEFAULT 50,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT DEFAULT 'Mon Agent',
            telegram_bot_token TEXT,
            telegram_chat_id TEXT,
            personality TEXT,
            onboarding_complete INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
            UNIQUE(agent_id, key)
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            channel TEXT DEFAULT 'telegram',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
        CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
    `;

    await client.query(schema);
}

async function migrateTable(client, table, rows) {
    for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

        const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})
                       ON CONFLICT DO NOTHING`;

        await client.query(query, values);
    }
}

async function initializePostgreSQL() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: true
    });

    const client = await pool.connect();
    try {
        console.log('📊 Creating tables in PostgreSQL...');
        await createTables(client);
        console.log('✅ Tables created\n');
        console.log('🎉 PostgreSQL database initialized!\n');
    } finally {
        client.release();
        pool.end();
    }
}

migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
