/**
 * Database Connection Switch
 * Selects between SQLite (dev) or PostgreSQL (production)
 */

const USE_POSTGRES = process.env.DB_HOST && process.env.DB_USER;

let db;

if (USE_POSTGRES) {
    console.log('🔗 Using PostgreSQL database');
    db = require('./postgres');
} else {
    console.log('💾 Using SQLite database');
    db = require('./db-sqlite');
}

module.exports = db;
