/**
 * Cost Tracker Service
 * Tracks all AI costs and ensures 30%+ margin
 *
 * Pricing strategy:
 * - Track actual cost per request
 * - Calculate required price for target margin
 * - Aggregate daily stats for monitoring
 */

const { nanoid } = require('nanoid');

// Target margin (30%)
const TARGET_MARGIN = 0.30;

// Cost per 1M tokens (in USD) - Updated February 2025
const MODEL_COSTS = {
    // Anthropic
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-opus-4-5': { input: 15.00, output: 75.00 },

    // OpenAI
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },

    // Mistral
    'mistral-small-latest': { input: 0.10, output: 0.30 },
    'mistral-medium-latest': { input: 0.27, output: 0.81 },
    'mistral-large-latest': { input: 2.00, output: 6.00 },

    // Google
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },

    // Embeddings
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 },

    // Images (per image, not per token)
    'dall-e-3': { perImage: 0.04 },
    'dall-e-3-hd': { perImage: 0.08 },
    'stable-diffusion-xl': { perImage: 0.002 },

    // Audio (per minute)
    'whisper-1': { perMinute: 0.006 },
    'elevenlabs': { perCharacter: 0.00003 }
};

/**
 * Calculate cost for a request
 */
function calculateCost(model, inputTokens, outputTokens, extras = {}) {
    const costs = MODEL_COSTS[model];
    if (!costs) {
        console.warn(`[CostTracker] Unknown model: ${model}`);
        return 0;
    }

    // Image costs
    if (costs.perImage && extras.imageCount) {
        return costs.perImage * extras.imageCount;
    }

    // Audio costs
    if (costs.perMinute && extras.audioMinutes) {
        return costs.perMinute * extras.audioMinutes;
    }

    // Character-based (TTS)
    if (costs.perCharacter && extras.characters) {
        return costs.perCharacter * extras.characters;
    }

    // Token-based
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    return inputCost + outputCost;
}

/**
 * Calculate price to charge for target margin
 */
function calculatePrice(cost, targetMargin = TARGET_MARGIN) {
    // price = cost / (1 - margin)
    // For 30% margin: price = cost / 0.70
    return cost / (1 - targetMargin);
}

/**
 * Track a request cost
 */
async function trackRequest(params, db) {
    const {
        userId,
        requestType = 'chat',
        provider,
        model,
        inputTokens = 0,
        outputTokens = 0,
        extras = {},
        fromCache = false,
        cacheHitId = null
    } = params;

    const cost = fromCache ? 0 : calculateCost(model, inputTokens, outputTokens, extras);
    const price = calculatePrice(cost);
    const margin = price - cost;
    const marginPercent = price > 0 ? (margin / price) * 100 : 100;

    const id = nanoid();

    try {
        await db.run(`
            INSERT INTO cost_tracking (
                id, user_id, request_type, provider, model,
                input_tokens, output_tokens, cost_usd, price_usd,
                margin_usd, margin_percent, from_cache, cache_hit_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            id, userId, requestType, provider, model,
            inputTokens, outputTokens, cost, price,
            margin, marginPercent, fromCache, cacheHitId
        ]);

        // Update daily stats
        await updateDailyStats(db, {
            cost,
            revenue: price,
            margin,
            provider,
            fromCache,
            cacheSavings: fromCache ? calculateCost(model, inputTokens, outputTokens, extras) : 0
        });

        return {
            id,
            cost,
            price,
            margin,
            marginPercent,
            fromCache
        };
    } catch (error) {
        console.error('[CostTracker] Track error:', error.message);
        return { cost, price, margin, marginPercent, fromCache };
    }
}

/**
 * Update daily aggregated stats
 */
async function updateDailyStats(db, params) {
    const { cost, revenue, margin, provider, fromCache, cacheSavings } = params;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Try to update existing row
        const result = await db.run(`
            UPDATE cost_daily_stats SET
                total_requests = total_requests + 1,
                total_cost_usd = total_cost_usd + $1,
                total_revenue_usd = total_revenue_usd + $2,
                total_margin_usd = total_margin_usd + $3,
                cache_hits = cache_hits + $4,
                cache_misses = cache_misses + $5,
                cache_savings_usd = cache_savings_usd + $6,
                anthropic_cost = anthropic_cost + $7,
                openai_cost = openai_cost + $8,
                mistral_cost = mistral_cost + $9,
                other_cost = other_cost + $10
            WHERE date = $11
        `, [
            cost,
            revenue,
            margin,
            fromCache ? 1 : 0,
            fromCache ? 0 : 1,
            cacheSavings,
            provider === 'anthropic' ? cost : 0,
            provider === 'openai' ? cost : 0,
            provider === 'mistral' ? cost : 0,
            !['anthropic', 'openai', 'mistral'].includes(provider) ? cost : 0,
            today
        ]);

        // If no row updated, insert new
        if (result.rowCount === 0) {
            await db.run(`
                INSERT INTO cost_daily_stats (
                    id, date, total_requests, total_cost_usd, total_revenue_usd,
                    total_margin_usd, cache_hits, cache_misses, cache_savings_usd,
                    anthropic_cost, openai_cost, mistral_cost, other_cost
                ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                nanoid(), today, cost, revenue, margin,
                fromCache ? 1 : 0, fromCache ? 0 : 1, cacheSavings,
                provider === 'anthropic' ? cost : 0,
                provider === 'openai' ? cost : 0,
                provider === 'mistral' ? cost : 0,
                !['anthropic', 'openai', 'mistral'].includes(provider) ? cost : 0
            ]);
        }
    } catch (error) {
        console.error('[CostTracker] Daily stats error:', error.message);
    }
}

/**
 * Get cost stats for a period
 */
async function getStats(db, days = 30) {
    try {
        const stats = await db.get(`
            SELECT
                SUM(total_requests) as total_requests,
                SUM(total_cost_usd) as total_cost,
                SUM(total_revenue_usd) as total_revenue,
                SUM(total_margin_usd) as total_margin,
                SUM(cache_hits) as cache_hits,
                SUM(cache_misses) as cache_misses,
                SUM(cache_savings_usd) as cache_savings,
                SUM(anthropic_cost) as anthropic_cost,
                SUM(openai_cost) as openai_cost,
                SUM(mistral_cost) as mistral_cost,
                SUM(other_cost) as other_cost
            FROM cost_daily_stats
            WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
        `);

        const cacheHitRate = stats.cache_hits + stats.cache_misses > 0
            ? (stats.cache_hits / (stats.cache_hits + stats.cache_misses)) * 100
            : 0;

        const actualMarginPercent = stats.total_revenue > 0
            ? (stats.total_margin / stats.total_revenue) * 100
            : 0;

        return {
            period: `${days} days`,
            totalRequests: stats.total_requests || 0,
            totalCost: stats.total_cost || 0,
            totalRevenue: stats.total_revenue || 0,
            totalMargin: stats.total_margin || 0,
            marginPercent: actualMarginPercent.toFixed(1),
            targetMarginPercent: TARGET_MARGIN * 100,
            cacheHits: stats.cache_hits || 0,
            cacheMisses: stats.cache_misses || 0,
            cacheHitRate: cacheHitRate.toFixed(1),
            cacheSavings: stats.cache_savings || 0,
            byProvider: {
                anthropic: stats.anthropic_cost || 0,
                openai: stats.openai_cost || 0,
                mistral: stats.mistral_cost || 0,
                other: stats.other_cost || 0
            }
        };
    } catch (error) {
        console.error('[CostTracker] Get stats error:', error.message);
        return null;
    }
}

/**
 * Get cheapest model for a given task type
 */
function getCheapestModel(taskType) {
    const modelsByTask = {
        simple: ['mistral-small-latest', 'gpt-4o-mini', 'gemini-1.5-flash'],
        code: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'mistral-large-latest'],
        analysis: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
        complex: ['claude-opus-4-5', 'gpt-4-turbo-preview'],
        image: ['stable-diffusion-xl', 'dall-e-3'],
        transcription: ['whisper-1'],
        tts: ['elevenlabs']
    };

    const candidates = modelsByTask[taskType] || modelsByTask.simple;

    // Sort by cost (cheapest first)
    return candidates.sort((a, b) => {
        const costA = MODEL_COSTS[a]?.input || MODEL_COSTS[a]?.perImage || 999;
        const costB = MODEL_COSTS[b]?.input || MODEL_COSTS[b]?.perImage || 999;
        return costA - costB;
    });
}

/**
 * Estimate cost before making request
 */
function estimateCost(model, estimatedInputTokens, estimatedOutputTokens = null) {
    const outputTokens = estimatedOutputTokens || estimatedInputTokens * 2;
    const cost = calculateCost(model, estimatedInputTokens, outputTokens);
    const price = calculatePrice(cost);

    return {
        model,
        estimatedCost: cost,
        estimatedPrice: price,
        estimatedMargin: price - cost,
        marginPercent: TARGET_MARGIN * 100
    };
}

module.exports = {
    calculateCost,
    calculatePrice,
    trackRequest,
    getStats,
    getCheapestModel,
    estimateCost,
    MODEL_COSTS,
    TARGET_MARGIN
};
