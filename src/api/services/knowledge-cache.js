/**
 * Knowledge Cache Service
 * Semantic cache for Q&A pairs - reuse answers to save API costs
 *
 * Flow:
 * 1. User asks question
 * 2. Generate embedding for question
 * 3. Search for similar questions in cache
 * 4. If match > threshold → return cached answer (cost = $0.00002 for embedding only)
 * 5. If no match → call AI, then store Q&A for future reuse
 */

const { nanoid } = require('nanoid');
const { generateEmbedding, cosineSimilarity } = require('./embeddings');

// In-memory cache for embeddings (loaded from DB on startup)
let embeddingsCache = [];
let cacheLoaded = false;

// Similarity threshold for cache hits
const SIMILARITY_THRESHOLD = 0.92; // 92% similarity required for cache hit
const MAX_CACHE_SIZE = 10000; // Max entries in memory

/**
 * Initialize cache from database
 */
async function initCache(db) {
    try {
        const entries = await db.all(`
            SELECT id, question, answer, question_embedding, category, quality_score
            FROM knowledge_base
            WHERE question_embedding IS NOT NULL
            ORDER BY use_count DESC, quality_score DESC
            LIMIT $1
        `, [MAX_CACHE_SIZE]);

        embeddingsCache = entries.map(entry => ({
            id: entry.id,
            question: entry.question,
            answer: entry.answer,
            embedding: JSON.parse(entry.question_embedding),
            category: entry.category,
            qualityScore: entry.quality_score
        }));

        cacheLoaded = true;
        console.log(`[KnowledgeCache] Loaded ${embeddingsCache.length} entries`);
    } catch (error) {
        console.error('[KnowledgeCache] Init error:', error.message);
        embeddingsCache = [];
        cacheLoaded = true; // Mark as loaded even on error to prevent retry loops
    }
}

/**
 * Search for similar question in cache
 * @param {string} question - User's question
 * @returns {Promise<{hit: boolean, answer?: string, similarity?: number, entryId?: string, embeddingCost: number}>}
 */
async function searchCache(question) {
    // Generate embedding for the question
    const embeddingResult = await generateEmbedding(question);

    if (!embeddingResult) {
        return { hit: false, embeddingCost: 0 };
    }

    const { embedding, cost: embeddingCost } = embeddingResult;

    // Search in cache
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const entry of embeddingsCache) {
        const similarity = cosineSimilarity(embedding, entry.embedding);
        if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
            bestSimilarity = similarity;
            bestMatch = entry;
        }
    }

    if (bestMatch) {
        console.log(`[KnowledgeCache] HIT! Similarity: ${(bestSimilarity * 100).toFixed(1)}% | Entry: ${bestMatch.id}`);
        return {
            hit: true,
            answer: bestMatch.answer,
            similarity: bestSimilarity,
            entryId: bestMatch.id,
            category: bestMatch.category,
            embeddingCost,
            queryEmbedding: embedding
        };
    }

    console.log(`[KnowledgeCache] MISS - Best similarity: ${(bestSimilarity * 100).toFixed(1)}%`);
    return {
        hit: false,
        embeddingCost,
        queryEmbedding: embedding,
        bestSimilarity
    };
}

/**
 * Store a new Q&A pair in the cache
 * @param {Object} params
 * @param {string} params.question - User's question
 * @param {string} params.answer - AI's answer
 * @param {number[]} params.embedding - Question embedding (optional, will generate if not provided)
 * @param {string} params.category - Question category
 * @param {string} params.model - AI model used
 * @param {number} params.cost - Cost in USD
 * @param {string} params.userId - User ID
 * @param {Object} db - Database instance
 */
async function storeInCache(params, db) {
    const { question, answer, embedding, category, model, cost, userId, language } = params;

    try {
        // Generate embedding if not provided
        let questionEmbedding = embedding;
        if (!questionEmbedding) {
            const embResult = await generateEmbedding(question);
            questionEmbedding = embResult?.embedding;
        }

        if (!questionEmbedding) {
            console.warn('[KnowledgeCache] Could not generate embedding, skipping cache store');
            return null;
        }

        const id = nanoid();

        // Store in database
        await db.run(`
            INSERT INTO knowledge_base (
                id, question, answer, question_embedding, category,
                language, original_model, original_cost, created_by_user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            id, question, answer, JSON.stringify(questionEmbedding),
            category, language || 'en', model, cost, userId
        ]);

        // Add to in-memory cache
        if (embeddingsCache.length < MAX_CACHE_SIZE) {
            embeddingsCache.push({
                id,
                question,
                answer,
                embedding: questionEmbedding,
                category,
                qualityScore: 0.5 // Default quality
            });
        }

        console.log(`[KnowledgeCache] Stored new entry: ${id}`);
        return id;
    } catch (error) {
        console.error('[KnowledgeCache] Store error:', error.message);
        return null;
    }
}

/**
 * Update cache entry usage stats
 */
async function recordCacheHit(entryId, db) {
    try {
        await db.run(`
            UPDATE knowledge_base
            SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [entryId]);
    } catch (error) {
        console.error('[KnowledgeCache] Record hit error:', error.message);
    }
}

/**
 * Update quality score based on user feedback
 */
async function updateQuality(entryId, feedback, db) {
    try {
        // feedback: 'positive' → increase score, 'negative' → decrease
        const delta = feedback === 'positive' ? 0.1 : -0.2;

        await db.run(`
            UPDATE knowledge_base
            SET quality_score = GREATEST(0, LEAST(1, quality_score + $1))
            WHERE id = $2
        `, [delta, entryId]);

        // Update in-memory cache
        const entry = embeddingsCache.find(e => e.id === entryId);
        if (entry) {
            entry.qualityScore = Math.max(0, Math.min(1, entry.qualityScore + delta));
        }
    } catch (error) {
        console.error('[KnowledgeCache] Update quality error:', error.message);
    }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
    return {
        entriesInMemory: embeddingsCache.length,
        cacheLoaded,
        similarityThreshold: SIMILARITY_THRESHOLD,
        maxCacheSize: MAX_CACHE_SIZE
    };
}

/**
 * Export knowledge base for fine-tuning
 * Returns Q&A pairs in JSONL format suitable for OpenAI fine-tuning
 */
async function exportForFineTuning(db, minQualityScore = 0.7, minUseCount = 3) {
    try {
        const entries = await db.all(`
            SELECT question, answer, category
            FROM knowledge_base
            WHERE quality_score >= $1 AND use_count >= $2
            ORDER BY quality_score DESC, use_count DESC
        `, [minQualityScore, minUseCount]);

        // Format for OpenAI fine-tuning
        const jsonlLines = entries.map(entry => JSON.stringify({
            messages: [
                { role: 'user', content: entry.question },
                { role: 'assistant', content: entry.answer }
            ]
        }));

        return {
            count: entries.length,
            jsonl: jsonlLines.join('\n'),
            format: 'openai-chat'
        };
    } catch (error) {
        console.error('[KnowledgeCache] Export error:', error.message);
        return { count: 0, jsonl: '', format: 'openai-chat' };
    }
}

module.exports = {
    initCache,
    searchCache,
    storeInCache,
    recordCacheHit,
    updateQuality,
    getCacheStats,
    exportForFineTuning,
    SIMILARITY_THRESHOLD
};
