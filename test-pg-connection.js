const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://agent_saas_db_user:iEVA8UjOUWN5n1joJB1ftR8VHi5mtB9g@dpg-d663c3ggjchc73cavc30-a/agent_saas_db';

async function test() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL connection successful!');
        
        // Test query
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query successful! Current time:', result.rows[0].now);
        
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

test();
