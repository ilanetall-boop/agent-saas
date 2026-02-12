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

module.exports = { runMigrations };
