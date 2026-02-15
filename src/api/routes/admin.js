/**
 * Admin Routes
 * Dashboard and management endpoints for the platform
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');
const { getStats: getCostStats } = require('../services/cost-tracker');
const { getMetrics, exportForFineTuning, analyzeGaps, cleanup } = require('../services/knowledge-capitalizer');
const { getCacheStats } = require('../services/knowledge-cache');

const router = express.Router();

// Admin check middleware
const adminOnly = (req, res, next) => {
    // Check if user is admin (you can customize this logic)
    if (req.user.tier !== 'admin' && req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ========== Dashboard Stats ==========
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [costStats, knowledgeMetrics, cacheStats] = await Promise.all([
            getCostStats(db, 30),
            getMetrics(db),
            Promise.resolve(getCacheStats())
        ]);

        res.json({
            success: true,
            costs: costStats,
            knowledge: knowledgeMetrics,
            cache: cacheStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});

// ========== Cost Analytics ==========
router.get('/costs', authMiddleware, adminOnly, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const stats = await getCostStats(db, days);

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Cost stats error:', error);
        res.status(500).json({ error: 'Failed to get cost stats' });
    }
});

// ========== Knowledge Base Management ==========

// Get knowledge metrics
router.get('/knowledge/metrics', authMiddleware, adminOnly, async (req, res) => {
    try {
        const metrics = await getMetrics(db);
        res.json({ success: true, metrics });
    } catch (error) {
        console.error('Knowledge metrics error:', error);
        res.status(500).json({ error: 'Failed to get knowledge metrics' });
    }
});

// Analyze knowledge gaps
router.get('/knowledge/gaps', authMiddleware, adminOnly, async (req, res) => {
    try {
        const gaps = await analyzeGaps(db);
        res.json({ success: true, gaps });
    } catch (error) {
        console.error('Knowledge gaps error:', error);
        res.status(500).json({ error: 'Failed to analyze gaps' });
    }
});

// Export for fine-tuning
router.get('/knowledge/export', authMiddleware, adminOnly, async (req, res) => {
    try {
        const format = req.query.format || 'openai';
        const minQuality = parseFloat(req.query.minQuality) || 0.6;
        const minUseCount = parseInt(req.query.minUseCount) || 2;

        const exportData = await exportForFineTuning(db, {
            format,
            minQualityScore: minQuality,
            minUseCount
        });

        // Return as downloadable file
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        res.send(exportData.data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export knowledge base' });
    }
});

// Export stats (without downloading file)
router.get('/knowledge/export/stats', authMiddleware, adminOnly, async (req, res) => {
    try {
        const format = req.query.format || 'openai';
        const minQuality = parseFloat(req.query.minQuality) || 0.6;
        const minUseCount = parseInt(req.query.minUseCount) || 2;

        const exportData = await exportForFineTuning(db, {
            format,
            minQualityScore: minQuality,
            minUseCount
        });

        res.json({
            success: true,
            stats: exportData.stats,
            format: exportData.format,
            filename: exportData.filename,
            readyForFineTuning: exportData.stats.totalEntries >= 1000
        });
    } catch (error) {
        console.error('Export stats error:', error);
        res.status(500).json({ error: 'Failed to get export stats' });
    }
});

// Cleanup low-quality entries (dry run by default)
router.post('/knowledge/cleanup', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { dryRun = true, maxAge = 90, minQuality = 0.3 } = req.body;

        const result = await cleanup(db, { dryRun, maxAge, minQuality });

        res.json({ success: true, result });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Failed to cleanup knowledge base' });
    }
});

// ========== User Management ==========
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const users = await db.all(`
            SELECT id, email, name, tier, plan, messages_used, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const total = await db.get('SELECT COUNT(*) as count FROM users');

        res.json({
            success: true,
            users,
            total: total.count,
            limit,
            offset
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ========== System Health ==========
router.get('/health', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Check database
        const dbHealth = await db.get('SELECT 1 as ok');

        // Check cache
        const cacheStats = getCacheStats();

        // Check API keys
        const apiKeys = {
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            mistral: !!process.env.MISTRAL_API_KEY,
            google: !!process.env.GOOGLE_SA_KEY
        };

        res.json({
            success: true,
            health: {
                database: dbHealth?.ok === 1 ? 'ok' : 'error',
                cache: cacheStats.cacheLoaded ? 'ok' : 'loading',
                cacheEntries: cacheStats.entriesInMemory,
                apiKeys
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Health check failed' });
    }
});

module.exports = router;
