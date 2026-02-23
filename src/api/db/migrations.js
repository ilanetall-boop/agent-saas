// Database migrations - Safe schema updates
// Handles backward compatibility with existing databases

const { Pool } = require('pg');

async function runMigrations(pool) {
    try {
        console.log('🔄 Running database migrations...');
        
        // Migration 1: Add email_verified column
        await addColumnIfNotExists(pool, 'users', 'email_verified', 'INTEGER DEFAULT 0');
        
        // Migration 2: Add email_verification_token column
        await addColumnIfNotExists(pool, 'users', 'email_verification_token', 'TEXT');
        
        // Migration 3: Add last_rotated_at column to sessions
        await addColumnIfNotExists(pool, 'sessions', 'last_rotated_at', 'TIMESTAMP');
        
        // Migration 4: Create index if not exists (must be after column exists)
        await createIndexIfNotExists(pool, 'sessions', 'idx_sessions_last_rotated', 'last_rotated_at');
        
        // Migration 5: Add tier column for pricing tiers (free/pro/business/vip)
        await addColumnIfNotExists(pool, 'users', 'tier', "VARCHAR(20) DEFAULT 'free'");
        
        // Migration 6: Add messages_today for daily tracking (fair use policy)
        await addColumnIfNotExists(pool, 'users', 'messages_today', 'INTEGER DEFAULT 0');
        
        // Migration 7: Add last_message_date for daily reset
        await addColumnIfNotExists(pool, 'users', 'last_message_date', 'DATE');
        
        // Migration 8: Add subscription_tier column (free/pro/enterprise/vip)
        await addColumnIfNotExists(pool, 'users', 'subscription_tier', "VARCHAR(20) DEFAULT 'free'");
        
        // Migration 9: Add Stripe customer ID for billing
        await addColumnIfNotExists(pool, 'users', 'stripe_customer_id', 'TEXT');
        
        // Migration 10: Add Stripe subscription ID for tracking active subscriptions
        await addColumnIfNotExists(pool, 'users', 'stripe_subscription_id', 'TEXT');
        
        // Migration 11: Add subscription start date
        await addColumnIfNotExists(pool, 'users', 'subscription_started_at', 'TIMESTAMP');
        
        // Migration 12: Add subscription renewal date
        await addColumnIfNotExists(pool, 'users', 'subscription_renews_at', 'TIMESTAMP');
        
        // Migration 13: Add Google OAuth ID
        await addColumnIfNotExists(pool, 'users', 'google_id', 'TEXT');
        
        // Migration 14: Add GitHub OAuth ID
        await addColumnIfNotExists(pool, 'users', 'github_id', 'TEXT');
        
        // Migration 15: Add GitHub username
        await addColumnIfNotExists(pool, 'users', 'github_username', 'TEXT');
        
        // Migration 16: Add avatar URL
        await addColumnIfNotExists(pool, 'users', 'avatar_url', 'TEXT');

        // Migration 17: Create knowledge_base table for semantic cache
        await createTableIfNotExists(pool, 'knowledge_base', `
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            question_embedding TEXT,
            category TEXT,
            language TEXT DEFAULT 'en',
            quality_score REAL DEFAULT 0.5,
            use_count INTEGER DEFAULT 0,
            original_model TEXT,
            original_cost REAL,
            created_by_user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP
        `);

        // Migration 18: Create cost_tracking table
        await createTableIfNotExists(pool, 'cost_tracking', `
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            request_type TEXT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            cost_usd REAL NOT NULL,
            price_usd REAL,
            margin_usd REAL,
            margin_percent REAL,
            from_cache BOOLEAN DEFAULT FALSE,
            cache_hit_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        // Migration 19: Create cost_daily_stats table
        await createTableIfNotExists(pool, 'cost_daily_stats', `
            id TEXT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            total_requests INTEGER DEFAULT 0,
            total_cost_usd REAL DEFAULT 0,
            total_revenue_usd REAL DEFAULT 0,
            total_margin_usd REAL DEFAULT 0,
            cache_hits INTEGER DEFAULT 0,
            cache_misses INTEGER DEFAULT 0,
            cache_savings_usd REAL DEFAULT 0,
            anthropic_cost REAL DEFAULT 0,
            openai_cost REAL DEFAULT 0,
            mistral_cost REAL DEFAULT 0,
            other_cost REAL DEFAULT 0
        `);

        // Migration 20: Create indexes for knowledge system
        await createIndexIfNotExists(pool, 'knowledge_base', 'idx_knowledge_category', 'category');
        await createIndexIfNotExists(pool, 'knowledge_base', 'idx_knowledge_quality', 'quality_score');
        await createIndexIfNotExists(pool, 'cost_tracking', 'idx_cost_user', 'user_id');
        await createIndexIfNotExists(pool, 'cost_tracking', 'idx_cost_created', 'created_at');

        // Migration 22: Create user_integrations table for N8N connections
        await createTableIfNotExists(pool, 'user_integrations', `
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            service TEXT NOT NULL,
            credentials TEXT,
            status TEXT DEFAULT 'disconnected',
            connected_at TIMESTAMP,
            last_used TIMESTAMP,
            expires_at TIMESTAMP,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, service)
        `);

        // Migration 23: Create indexes for user_integrations
        await createIndexIfNotExists(pool, 'user_integrations', 'idx_user_integrations_user', 'user_id');
        await createIndexIfNotExists(pool, 'user_integrations', 'idx_user_integrations_service', 'service');
        await createIndexIfNotExists(pool, 'user_integrations', 'idx_user_integrations_status', 'status');

        // Migration 24: Enable pgvector extension for vector similarity search
        const pgvectorEnabled = await enablePgvector(pool);

        // Migration 25: Create agent_memories table (tri-type memory system)
        const embeddingColType = pgvectorEnabled ? 'vector(1536)' : 'TEXT';
        await createTableIfNotExists(pool, 'agent_memories', `
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('semantic', 'episodic', 'procedural')),
            content TEXT NOT NULL,
            source TEXT DEFAULT 'conversation',
            embedding ${embeddingColType},
            importance REAL DEFAULT 0.5,
            access_count INTEGER DEFAULT 0,
            last_accessed_at TIMESTAMP,
            event_date TIMESTAMP,
            category VARCHAR(50),
            conversation_id TEXT,
            superseded_by TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        `);

        // Migration 26: Create HNSW vector index (only if pgvector is available)
        if (pgvectorEnabled) {
            await createVectorIndexIfNotExists(pool);
        }

        // Migration 27: Create standard indexes for agent_memories
        await createIndexIfNotExists(pool, 'agent_memories', 'idx_agent_memories_agent', 'agent_id');
        await createIndexIfNotExists(pool, 'agent_memories', 'idx_agent_memories_type', 'agent_id, type');
        await createIndexIfNotExists(pool, 'agent_memories', 'idx_agent_memories_active', 'agent_id, is_active');
        await createIndexIfNotExists(pool, 'agent_memories', 'idx_agent_memories_importance', 'importance DESC');

        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

async function addColumnIfNotExists(pool, tableName, columnName, columnDef) {
    try {
        // Check if column exists
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            )
        `, [tableName, columnName]);
        
        const columnExists = checkResult.rows[0].exists;
        
        if (!columnExists) {
            console.log(`  ➕ Adding column ${tableName}.${columnName}...`);
            await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
            console.log(`  ✅ Column ${columnName} added to ${tableName}`);
        } else {
            console.log(`  ✓ Column ${columnName} already exists in ${tableName}`);
        }
    } catch (error) {
        console.error(`Error adding column ${columnName} to ${tableName}:`, error);
        throw error;
    }
}

async function createTableIfNotExists(pool, tableName, columns) {
    try {
        // Check if table exists
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = $1
            )
        `, [tableName]);

        const tableExists = checkResult.rows[0].exists;

        if (!tableExists) {
            console.log(`  ➕ Creating table ${tableName}...`);
            await pool.query(`CREATE TABLE ${tableName} (${columns})`);
            console.log(`  ✅ Table ${tableName} created`);
        } else {
            console.log(`  ✓ Table ${tableName} already exists`);
        }
    } catch (error) {
        console.error(`Error creating table ${tableName}:`, error);
        throw error;
    }
}

async function createIndexIfNotExists(pool, tableName, indexName, columnName) {
    try {
        // Check if index exists
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = $1
            )
        `, [indexName]);
        
        const indexExists = checkResult.rows[0].exists;
        
        if (!indexExists) {
            console.log(`  ➕ Creating index ${indexName} on ${tableName}(${columnName})...`);
            await pool.query(`CREATE INDEX ${indexName} ON ${tableName}(${columnName})`);
            console.log(`  ✅ Index ${indexName} created`);
        } else {
            console.log(`  ✓ Index ${indexName} already exists`);
        }
    } catch (error) {
        console.error(`Error creating index ${indexName}:`, error);
        throw error;
    }
}

async function enablePgvector(pool) {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('  ✅ pgvector extension enabled');
        return true;
    } catch (error) {
        console.warn('  ⚠️ pgvector not available, using TEXT fallback for embeddings:', error.message);
        return false;
    }
}

async function createVectorIndexIfNotExists(pool) {
    const indexName = 'idx_agent_memories_embedding';
    try {
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = $1
            )
        `, [indexName]);

        if (!checkResult.rows[0].exists) {
            console.log(`  ➕ Creating HNSW vector index ${indexName}...`);
            await pool.query(`
                CREATE INDEX ${indexName}
                ON agent_memories USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            `);
            console.log(`  ✅ HNSW vector index created`);
        } else {
            console.log(`  ✓ Vector index ${indexName} already exists`);
        }
    } catch (error) {
        console.warn('  ⚠️ Could not create HNSW index:', error.message);
    }
}

module.exports = { runMigrations };
