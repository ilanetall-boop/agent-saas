/**
 * Memory Manager Service
 * AgentVault-inspired tri-type memory system for Eva
 *
 * Memory types:
 * - Semantic: Facts about the user (name, job, location, preferences)
 * - Episodic: Events and interactions (what happened, when)
 * - Procedural: Learned behaviors (communication style, design preferences)
 *
 * Uses pgvector for similarity search with composite relevance scoring.
 */

const { nanoid } = require('nanoid');
const { generateEmbedding } = require('./embeddings');

// Relevance scoring weights
const RELEVANCE_WEIGHTS = {
    similarity: 0.45,
    recency: 0.25,
    importance: 0.20,
    frequency: 0.10
};

const TOTAL_MAX_MEMORIES = 15;
const MAX_PER_TYPE = { semantic: 8, episodic: 5, procedural: 5 };

/**
 * Compute composite relevance score for a memory
 */
function computeRelevanceScore(memory) {
    const now = Date.now();

    // Similarity (already 0-1 from pgvector/cosine)
    const simScore = memory.similarity || 0;

    // Recency: exponential decay, half-life ~14 days
    const daysSinceAccess = memory.last_accessed_at
        ? (now - new Date(memory.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24)
        : 30;
    const recencyScore = Math.exp(-0.05 * daysSinceAccess);

    // Importance (already 0-1)
    const importanceScore = memory.importance || 0.5;

    // Frequency: logarithmic, capped at 50
    const freqScore = Math.min(
        Math.log10(1 + (memory.access_count || 0)) / Math.log10(51),
        1
    );

    return (
        RELEVANCE_WEIGHTS.similarity * simScore +
        RELEVANCE_WEIGHTS.recency * recencyScore +
        RELEVANCE_WEIGHTS.importance * importanceScore +
        RELEVANCE_WEIGHTS.frequency * freqScore
    );
}

/**
 * Retrieve the most relevant memories for a given message
 * @param {string} agentId
 * @param {string} message - The user's current message
 * @param {object} db - Database module
 * @returns {Promise<Array>} Scored and sorted memories
 */
async function retrieveRelevantMemories(agentId, message, db) {
    // Generate embedding for the user's message
    const embResult = await generateEmbedding(message);
    if (!embResult) {
        // Fallback: return top memories by importance (no vector search)
        const allMemories = await db.getAllActiveAgentMemories(agentId);
        return allMemories
            .slice(0, TOTAL_MAX_MEMORIES)
            .map(m => ({ ...m, similarity: 0, relevanceScore: m.importance || 0.5 }));
    }

    // Vector search: get candidate memories
    const candidates = await db.searchAgentMemories(agentId, embResult.embedding, {
        limit: 30,
        minSimilarity: 0.2
    });

    // Score each candidate with composite relevance
    const scored = candidates.map(m => ({
        ...m,
        relevanceScore: computeRelevanceScore(m)
    }));

    // Sort by composite score
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply per-type caps
    const result = [];
    const typeCounts = { semantic: 0, episodic: 0, procedural: 0 };

    for (const memory of scored) {
        if (result.length >= TOTAL_MAX_MEMORIES) break;
        if (typeCounts[memory.type] >= MAX_PER_TYPE[memory.type]) continue;
        result.push(memory);
        typeCounts[memory.type]++;
    }

    // Update access counts for retrieved memories
    const memoryIds = result.map(m => m.id);
    if (memoryIds.length > 0) {
        db.updateMemoryAccess(memoryIds).catch(err =>
            console.error('[MemoryManager] Failed to update access counts:', err.message)
        );
    }

    return result;
}

/**
 * Format memories into structured context for the system prompt
 * @param {Array} memories - Scored memories from retrieveRelevantMemories
 * @param {string} language - 'fr' or 'en'
 * @returns {string} Formatted context string
 */
function formatMemoryContext(memories, language = 'fr') {
    if (!memories || memories.length === 0) return '';

    const semantic = memories.filter(m => m.type === 'semantic');
    const episodic = memories.filter(m => m.type === 'episodic');
    const procedural = memories.filter(m => m.type === 'procedural');

    let context = '';

    if (language === 'fr') {
        if (semantic.length > 0) {
            context += '\n\n=== Ce que tu sais sur cette personne ===\n';
            semantic.forEach(m => { context += `- ${m.content}\n`; });
        }
        if (episodic.length > 0) {
            context += '\n=== Historique des interactions ===\n';
            episodic.forEach(m => {
                const date = m.event_date ? new Date(m.event_date).toLocaleDateString('fr-FR') : '';
                context += `- ${date ? `[${date}] ` : ''}${m.content}\n`;
            });
        }
        if (procedural.length > 0) {
            context += '\n=== Comment interagir ===\n';
            procedural.forEach(m => { context += `- ${m.content}\n`; });
        }
    } else {
        if (semantic.length > 0) {
            context += '\n\n=== What you know about this person ===\n';
            semantic.forEach(m => { context += `- ${m.content}\n`; });
        }
        if (episodic.length > 0) {
            context += '\n=== Interaction history ===\n';
            episodic.forEach(m => {
                const date = m.event_date ? new Date(m.event_date).toLocaleDateString('en-US') : '';
                context += `- ${date ? `[${date}] ` : ''}${m.content}\n`;
            });
        }
        if (procedural.length > 0) {
            context += '\n=== How to interact ===\n';
            procedural.forEach(m => { context += `- ${m.content}\n`; });
        }
    }

    return context;
}

/**
 * Migrate onboarding memories from legacy key-value to tri-type system
 * Called once when onboarding completes
 */
async function migrateOnboardingMemories(agentId, memoryMap, db) {
    const migrations = [
        { key: 'name', type: 'semantic', importance: 0.95 },
        { key: 'job', type: 'semantic', importance: 0.9 },
        { key: 'challenge', type: 'semantic', importance: 0.8 },
        { key: 'first_need', type: 'episodic', importance: 0.7 }
    ];

    for (const { key, type, importance } of migrations) {
        const value = memoryMap[key];
        if (!value) continue;

        const content = key === 'name'
            ? `Son prenom est ${value}`
            : key === 'job'
                ? `Profession/activite: ${value}`
                : key === 'challenge'
                    ? `Son defi principal: ${value}`
                    : `Premier besoin exprime: ${value}`;

        // Generate embedding
        const embResult = await generateEmbedding(content);
        const embedding = embResult ? embResult.embedding : null;

        await db.createAgentMemory(nanoid(), agentId, type, content, embedding, {
            source: 'onboarding',
            importance,
            eventDate: type === 'episodic' ? new Date() : null
        });
    }

    console.log(`[MemoryManager] Migrated onboarding memories for agent ${agentId}`);
}

module.exports = {
    retrieveRelevantMemories,
    formatMemoryContext,
    computeRelevanceScore,
    migrateOnboardingMemories
};
