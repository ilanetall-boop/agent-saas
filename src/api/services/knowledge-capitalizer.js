/**
 * Knowledge Capitalizer
 * Manages the knowledge flywheel for building your own AI
 *
 * Purpose:
 * 1. Accumulate high-quality Q&A pairs from user interactions
 * 2. Track quality through feedback and reuse metrics
 * 3. Export data for fine-tuning your own model
 * 4. Analyze patterns to improve routing and caching
 */

const { nanoid } = require('nanoid');

/**
 * Quality scoring system
 * - Reuse: more reuse = higher quality
 * - Feedback: user thumbs up/down
 * - Length: very short answers may be low quality
 * - Conversation continuation: if user continues, answer was helpful
 */

const QUALITY_WEIGHTS = {
    reuseCount: 0.3,      // 30% weight for reuse frequency
    positiveFeedback: 0.3, // 30% weight for explicit positive feedback
    conversationFlow: 0.2, // 20% weight for conversation continuation
    answerLength: 0.1,    // 10% weight for answer completeness
    modelTier: 0.1        // 10% weight for model quality used
};

/**
 * Update quality score for a knowledge entry
 */
async function updateQualityScore(entryId, db) {
    try {
        // Get entry data
        const entry = await db.get(`
            SELECT use_count, quality_score, original_model, answer
            FROM knowledge_base WHERE id = $1
        `, [entryId]);

        if (!entry) return;

        // Calculate new score
        let score = 0;

        // Reuse factor (normalized, max at 100 uses)
        const reuseFactor = Math.min(entry.use_count / 100, 1);
        score += reuseFactor * QUALITY_WEIGHTS.reuseCount;

        // Answer length factor (normalized, 100-2000 chars is good)
        const answerLen = entry.answer?.length || 0;
        const lengthFactor = answerLen >= 100 && answerLen <= 2000 ? 1 : 0.5;
        score += lengthFactor * QUALITY_WEIGHTS.answerLength;

        // Model tier factor
        const modelTierFactor = entry.original_model?.includes('opus') ? 1 :
                                entry.original_model?.includes('sonnet') ? 0.8 :
                                entry.original_model?.includes('gpt-4') ? 0.9 : 0.6;
        score += modelTierFactor * QUALITY_WEIGHTS.modelTier;

        // Keep existing score influence (momentum)
        score = score * 0.7 + (entry.quality_score || 0.5) * 0.3;

        // Update in database
        await db.run(`
            UPDATE knowledge_base SET quality_score = $1 WHERE id = $2
        `, [score, entryId]);

        return score;
    } catch (error) {
        console.error('[Capitalizer] Update quality error:', error.message);
        return null;
    }
}

/**
 * Record user feedback
 */
async function recordFeedback(entryId, feedback, userId, db) {
    try {
        // feedback: 'positive', 'negative', 'neutral'
        const delta = feedback === 'positive' ? 0.15 :
                      feedback === 'negative' ? -0.25 : 0;

        await db.run(`
            UPDATE knowledge_base
            SET quality_score = GREATEST(0, LEAST(1, quality_score + $1))
            WHERE id = $2
        `, [delta, entryId]);

        // Log feedback for analysis
        await db.run(`
            INSERT INTO audit_logs (id, action, user_id, details, created_at)
            VALUES ($1, 'knowledge_feedback', $2, $3, CURRENT_TIMESTAMP)
        `, [nanoid(), userId, JSON.stringify({ entryId, feedback })]);

        console.log(`[Capitalizer] Feedback recorded: ${feedback} for entry ${entryId}`);
    } catch (error) {
        console.error('[Capitalizer] Record feedback error:', error.message);
    }
}

/**
 * Export knowledge base for fine-tuning
 * Supports multiple formats: OpenAI, Anthropic, generic JSONL
 */
async function exportForFineTuning(db, options = {}) {
    const {
        format = 'openai',        // 'openai', 'anthropic', 'jsonl'
        minQualityScore = 0.6,
        minUseCount = 2,
        maxEntries = 10000,
        categories = null         // Filter by categories if specified
    } = options;

    try {
        let query = `
            SELECT question, answer, category, quality_score, use_count
            FROM knowledge_base
            WHERE quality_score >= $1 AND use_count >= $2
        `;
        const params = [minQualityScore, minUseCount];

        if (categories && categories.length > 0) {
            query += ` AND category = ANY($3)`;
            params.push(categories);
        }

        query += ` ORDER BY quality_score DESC, use_count DESC LIMIT $${params.length + 1}`;
        params.push(maxEntries);

        const entries = await db.all(query, params);

        let output;
        switch (format) {
            case 'openai':
                output = entries.map(e => JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a helpful AI assistant.' },
                        { role: 'user', content: e.question },
                        { role: 'assistant', content: e.answer }
                    ]
                })).join('\n');
                break;

            case 'anthropic':
                output = entries.map(e => JSON.stringify({
                    prompt: `\n\nHuman: ${e.question}\n\nAssistant:`,
                    completion: ` ${e.answer}`
                })).join('\n');
                break;

            case 'jsonl':
            default:
                output = entries.map(e => JSON.stringify({
                    input: e.question,
                    output: e.answer,
                    metadata: {
                        category: e.category,
                        quality: e.quality_score,
                        useCount: e.use_count
                    }
                })).join('\n');
        }

        const stats = {
            totalEntries: entries.length,
            avgQuality: entries.reduce((sum, e) => sum + e.quality_score, 0) / entries.length,
            avgUseCount: entries.reduce((sum, e) => sum + e.use_count, 0) / entries.length,
            byCategory: {}
        };

        entries.forEach(e => {
            stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
        });

        return {
            format,
            data: output,
            stats,
            filename: `finetune_${format}_${new Date().toISOString().split('T')[0]}.jsonl`
        };
    } catch (error) {
        console.error('[Capitalizer] Export error:', error.message);
        return { format, data: '', stats: {}, error: error.message };
    }
}

/**
 * Analyze knowledge gaps
 * Find topics where cache miss rate is high
 */
async function analyzeGaps(db) {
    try {
        // Get categories with low hit rates
        const stats = await db.all(`
            SELECT
                category,
                COUNT(*) as total_entries,
                AVG(use_count) as avg_use,
                AVG(quality_score) as avg_quality
            FROM knowledge_base
            GROUP BY category
            ORDER BY avg_use ASC
        `);

        // Get recent misses (questions without good cache hits)
        const recentMisses = await db.all(`
            SELECT details
            FROM audit_logs
            WHERE action = 'cache_miss'
            ORDER BY created_at DESC
            LIMIT 100
        `);

        return {
            categoryStats: stats,
            recentMisses: recentMisses.map(m => JSON.parse(m.details || '{}')),
            recommendations: generateRecommendations(stats)
        };
    } catch (error) {
        console.error('[Capitalizer] Analyze gaps error:', error.message);
        return { categoryStats: [], recentMisses: [], recommendations: [] };
    }
}

/**
 * Generate recommendations for improving knowledge base
 */
function generateRecommendations(categoryStats) {
    const recommendations = [];

    for (const stat of categoryStats) {
        if (stat.avg_quality < 0.5) {
            recommendations.push({
                type: 'improve_quality',
                category: stat.category,
                message: `Category "${stat.category}" has low average quality (${(stat.avg_quality * 100).toFixed(0)}%). Consider reviewing and improving entries.`
            });
        }

        if (stat.total_entries < 10) {
            recommendations.push({
                type: 'add_content',
                category: stat.category,
                message: `Category "${stat.category}" has few entries (${stat.total_entries}). More diverse examples would improve cache hit rate.`
            });
        }
    }

    return recommendations;
}

/**
 * Get capitalization metrics for dashboard
 */
async function getMetrics(db) {
    try {
        const totals = await db.get(`
            SELECT
                COUNT(*) as total_entries,
                SUM(use_count) as total_reuses,
                AVG(quality_score) as avg_quality,
                SUM(original_cost) as total_original_cost
            FROM knowledge_base
        `);

        const topEntries = await db.all(`
            SELECT id, question, use_count, quality_score
            FROM knowledge_base
            ORDER BY use_count DESC
            LIMIT 10
        `);

        const recentEntries = await db.all(`
            SELECT id, question, category, created_at
            FROM knowledge_base
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Estimate savings from reuse
        const estimatedSavings = (totals.total_reuses || 0) * 0.001; // ~$0.001 per reused query

        return {
            totalEntries: totals.total_entries || 0,
            totalReuses: totals.total_reuses || 0,
            avgQuality: (totals.avg_quality || 0).toFixed(2),
            totalOriginalCost: totals.total_original_cost || 0,
            estimatedSavings: estimatedSavings.toFixed(2),
            topEntries,
            recentEntries,
            readyForFineTuning: (totals.total_entries || 0) >= 1000 && (totals.avg_quality || 0) >= 0.7
        };
    } catch (error) {
        console.error('[Capitalizer] Get metrics error:', error.message);
        return {
            totalEntries: 0,
            totalReuses: 0,
            avgQuality: '0',
            estimatedSavings: '0',
            readyForFineTuning: false
        };
    }
}

/**
 * Cleanup low-quality entries
 */
async function cleanup(db, options = {}) {
    const { maxAge = 90, minQuality = 0.3, dryRun = true } = options;

    try {
        const query = `
            SELECT id, question, quality_score, use_count, created_at
            FROM knowledge_base
            WHERE quality_score < $1
            AND use_count < 2
            AND created_at < CURRENT_TIMESTAMP - INTERVAL '${maxAge} days'
        `;

        const candidates = await db.all(query, [minQuality]);

        if (dryRun) {
            return {
                dryRun: true,
                wouldDelete: candidates.length,
                candidates: candidates.slice(0, 10)
            };
        }

        // Actually delete
        const result = await db.run(`
            DELETE FROM knowledge_base
            WHERE quality_score < $1
            AND use_count < 2
            AND created_at < CURRENT_TIMESTAMP - INTERVAL '${maxAge} days'
        `, [minQuality]);

        return {
            dryRun: false,
            deleted: result.rowCount
        };
    } catch (error) {
        console.error('[Capitalizer] Cleanup error:', error.message);
        return { error: error.message };
    }
}

module.exports = {
    updateQualityScore,
    recordFeedback,
    exportForFineTuning,
    analyzeGaps,
    getMetrics,
    cleanup,
    QUALITY_WEIGHTS
};
