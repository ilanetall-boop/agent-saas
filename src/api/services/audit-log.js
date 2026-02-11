/**
 * Audit Logging Service
 * Logs all security-relevant events for compliance & debugging
 */

const fs = require('fs');
const path = require('path');

// Resolve to project root/data directory
const LOG_DIR = path.join(__dirname, '../../../data');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log a security event
 * @param {Object} event - Event object with type, details, etc
 */
function log(event) {
    const entry = {
        timestamp: new Date().toISOString(),
        ...event
    };
    
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (err) {
        console.error('Failed to write audit log:', err);
    }
    
    // Alert on suspicious activity (log to console)
    if (event.type === 'login_failed' && event.attempt >= 5) {
        console.log(`🚨 SECURITY ALERT: ${event.email} failed 5+ login attempts`);
    }
    
    if (event.type === 'rate_limit_exceeded') {
        console.log(`🚨 SECURITY ALERT: Rate limit exceeded from ${event.ipAddress}`);
    }
}

/**
 * Get audit log entries (last N lines)
 * @param {number} limit - Number of recent entries to return
 * @returns {Array<Object>} Log entries
 */
function getRecent(limit = 100) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }
        
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.trim().split('\n');
        
        return lines
            .slice(-limit)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return null;
                }
            })
            .filter(entry => entry !== null);
    } catch (err) {
        console.error('Failed to read audit log:', err);
        return [];
    }
}

/**
 * Get audit log statistics
 * @returns {Object} Stats object
 */
function getStats() {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return {
                totalEvents: 0,
                loginAttempts: 0,
                registrations: 0,
                failedLogins: 0,
                tokenRefreshes: 0,
                lastEvent: null
            };
        }
        
        const entries = getRecent(10000); // Get all entries
        
        return {
            totalEvents: entries.length,
            loginAttempts: entries.filter(e => e.type === 'login_success').length,
            registrations: entries.filter(e => e.type === 'user_registered').length,
            failedLogins: entries.filter(e => e.type === 'login_failed').length,
            tokenRefreshes: entries.filter(e => e.type === 'token_refreshed').length,
            logouts: entries.filter(e => e.type === 'logout').length,
            lastEvent: entries[entries.length - 1] || null
        };
    } catch (err) {
        console.error('Failed to compute audit stats:', err);
        return null;
    }
}

/**
 * Clear audit log (use carefully!)
 */
function clear() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            fs.unlinkSync(LOG_FILE);
            console.log('Audit log cleared');
        }
    } catch (err) {
        console.error('Failed to clear audit log:', err);
    }
}

module.exports = {
    log,
    getRecent,
    getStats,
    clear
};
