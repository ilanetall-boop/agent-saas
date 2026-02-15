/**
 * Embeddings Service
 * Generates vector embeddings for semantic search
 * Uses OpenAI text-embedding-3-small (cheapest: $0.02/1M tokens)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a text
 * @param {string} text - Text to embed
 * @returns {Promise<{embedding: number[], tokens: number, cost: number}>}
 */
async function generateEmbedding(text) {
    if (!OPENAI_API_KEY) {
        console.warn('[Embeddings] OPENAI_API_KEY not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: text.substring(0, 8000), // Max ~8K tokens
                dimensions: EMBEDDING_DIMENSIONS
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Embedding API error');
        }

        const data = await response.json();
        const tokens = data.usage?.total_tokens || 0;

        return {
            embedding: data.data[0].embedding,
            tokens,
            cost: tokens * 0.00000002 // $0.02 per 1M tokens
        };
    } catch (error) {
        console.error('[Embeddings] Error:', error.message);
        return null;
    }
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<{embeddings: number[][], tokens: number, cost: number}>}
 */
async function generateEmbeddings(texts) {
    if (!OPENAI_API_KEY) {
        console.warn('[Embeddings] OPENAI_API_KEY not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: texts.map(t => t.substring(0, 8000)),
                dimensions: EMBEDDING_DIMENSIONS
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Embedding API error');
        }

        const data = await response.json();
        const tokens = data.usage?.total_tokens || 0;

        return {
            embeddings: data.data.map(d => d.embedding),
            tokens,
            cost: tokens * 0.00000002
        };
    } catch (error) {
        console.error('[Embeddings] Batch error:', error.message);
        return null;
    }
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding
 * @param {number[]} b - Second embedding
 * @returns {number} Similarity score between 0 and 1
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Find most similar embeddings from a list
 * @param {number[]} queryEmbedding - Query embedding
 * @param {Array<{id: string, embedding: number[]}>} candidates - Candidate embeddings
 * @param {number} topK - Number of results to return
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {Array<{id: string, similarity: number}>}
 */
function findSimilar(queryEmbedding, candidates, topK = 5, threshold = 0.8) {
    const results = candidates
        .map(candidate => ({
            id: candidate.id,
            similarity: cosineSimilarity(queryEmbedding, candidate.embedding)
        }))
        .filter(r => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    return results;
}

module.exports = {
    generateEmbedding,
    generateEmbeddings,
    cosineSimilarity,
    findSimilar,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS
};
