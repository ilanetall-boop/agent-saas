// Phase 2 Database Migrations - Knowledge Base System
// This file creates tables for the community learning system

const { Pool } = require('pg');

async function runPhase2Migrations(pool) {
    try {
        console.log('🔄 Running Phase 2 migrations (Knowledge Base)...');
        
        // Migration 1: Create knowledge_solutions table
        await createKnowledgeSolutionsTable(pool);
        
        // Migration 2: Create solution_usage table
        await createSolutionUsageTable(pool);
        
        // Migration 3: Create user_community_settings table
        await createUserCommunitySettingsTable(pool);
        
        // Migration 4: Create knowledge_access_log table
        await createKnowledgeAccessLogTable(pool);
        
        // Migration 5: Add indexes for performance
        await createIndexes(pool);
        
        console.log('✅ Phase 2 migrations completed successfully');
    } catch (error) {
        console.error('❌ Phase 2 migration error:', error);
        throw error;
    }
}

async function createKnowledgeSolutionsTable(pool) {
    const checkResult = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'knowledge_solutions'
        )
    `);
    
    if (!checkResult.rows[0].exists) {
        console.log('  ➕ Creating knowledge_solutions table...');
        await pool.query(`
            CREATE TABLE knowledge_solutions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                solution TEXT NOT NULL,
                difficulty VARCHAR(20) DEFAULT 'intermediate',
                
                -- Effectiveness tracking
                success_rate DECIMAL(3,2) DEFAULT 0.50,
                avg_time_minutes INTEGER DEFAULT 0,
                attempt_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                
                -- Quality metrics
                quality_score DECIMAL(3,2) DEFAULT 0,
                helpful_count INTEGER DEFAULT 0,
                issue_count INTEGER DEFAULT 0,
                
                -- Metadata
                created_by_user_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by_community BOOLEAN DEFAULT true,
                
                CONSTRAINT fk_creator FOREIGN KEY (created_by_user_id) 
                    REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        console.log('  ✅ knowledge_solutions table created');
    } else {
        console.log('  ✓ knowledge_solutions table already exists');
    }
}

async function createSolutionUsageTable(pool) {
    const checkResult = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'solution_usage'
        )
    `);
    
    if (!checkResult.rows[0].exists) {
        console.log('  ➕ Creating solution_usage table...');
        await pool.query(`
            CREATE TABLE solution_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                solution_id UUID NOT NULL,
                
                -- Attempt tracking
                success BOOLEAN,
                time_taken_minutes INTEGER,
                feedback TEXT,
                feedback_helpful BOOLEAN,
                
                -- Error tracking
                errors_encountered TEXT[],
                resolution TEXT,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                shared_to_community BOOLEAN DEFAULT false,
                
                CONSTRAINT fk_user FOREIGN KEY (user_id) 
                    REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_solution FOREIGN KEY (solution_id) 
                    REFERENCES knowledge_solutions(id) ON DELETE CASCADE
            );
        `);
        console.log('  ✅ solution_usage table created');
    } else {
        console.log('  ✓ solution_usage table already exists');
    }
}

async function createUserCommunitySettingsTable(pool) {
    const checkResult = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'user_community_settings'
        )
    `);
    
    if (!checkResult.rows[0].exists) {
        console.log('  ➕ Creating user_community_settings table...');
        await pool.query(`
            CREATE TABLE user_community_settings (
                user_id UUID PRIMARY KEY,
                
                -- Opt-in preferences
                contribute_to_community BOOLEAN DEFAULT true,
                allow_pattern_sharing BOOLEAN DEFAULT true,
                allow_usage_tracking BOOLEAN DEFAULT true,
                
                -- Privacy controls
                opt_out_solution_ids UUID[] DEFAULT '{}',
                privacy_level VARCHAR(20) DEFAULT 'community',
                
                -- Consent tracking
                consent_given_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                consent_version VARCHAR(10) DEFAULT '1.0',
                
                -- Impact metrics
                contributions_count INTEGER DEFAULT 0,
                solutions_helped_count INTEGER DEFAULT 0,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT fk_user FOREIGN KEY (user_id) 
                    REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('  ✅ user_community_settings table created');
    } else {
        console.log('  ✓ user_community_settings table already exists');
    }
}

async function createKnowledgeAccessLogTable(pool) {
    const checkResult = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'knowledge_access_log'
        )
    `);
    
    if (!checkResult.rows[0].exists) {
        console.log('  ➕ Creating knowledge_access_log table...');
        await pool.query(`
            CREATE TABLE knowledge_access_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                solution_id UUID NOT NULL,
                
                -- Tracking what Eva did
                eva_referenced_solution BOOLEAN DEFAULT false,
                eva_recommended BOOLEAN DEFAULT false,
                user_accepted BOOLEAN DEFAULT false,
                user_rated INTEGER,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT fk_user FOREIGN KEY (user_id) 
                    REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_solution FOREIGN KEY (solution_id) 
                    REFERENCES knowledge_solutions(id) ON DELETE CASCADE,
                CONSTRAINT rating_range CHECK (user_rated >= 1 AND user_rated <= 5)
            );
        `);
        console.log('  ✅ knowledge_access_log table created');
    } else {
        console.log('  ✓ knowledge_access_log table already exists');
    }
}

async function createIndexes(pool) {
    const indexes = [
        {
            name: 'idx_knowledge_solutions_category',
            query: 'CREATE INDEX IF NOT EXISTS idx_knowledge_solutions_category ON knowledge_solutions(category)'
        },
        {
            name: 'idx_knowledge_solutions_success_rate',
            query: 'CREATE INDEX IF NOT EXISTS idx_knowledge_solutions_success_rate ON knowledge_solutions(success_rate DESC)'
        },
        {
            name: 'idx_solution_usage_user',
            query: 'CREATE INDEX IF NOT EXISTS idx_solution_usage_user ON solution_usage(user_id)'
        },
        {
            name: 'idx_solution_usage_solution',
            query: 'CREATE INDEX IF NOT EXISTS idx_solution_usage_solution ON solution_usage(solution_id)'
        },
        {
            name: 'idx_solution_usage_success',
            query: 'CREATE INDEX IF NOT EXISTS idx_solution_usage_success ON solution_usage(success)'
        },
        {
            name: 'idx_knowledge_access_log_user',
            query: 'CREATE INDEX IF NOT EXISTS idx_knowledge_access_log_user ON knowledge_access_log(user_id)'
        },
        {
            name: 'idx_knowledge_access_log_solution',
            query: 'CREATE INDEX IF NOT EXISTS idx_knowledge_access_log_solution ON knowledge_access_log(solution_id)'
        }
    ];
    
    console.log('  ➕ Creating indexes...');
    for (const index of indexes) {
        await pool.query(index.query);
    }
    console.log('  ✅ Indexes created');
}

module.exports = { runPhase2Migrations };
