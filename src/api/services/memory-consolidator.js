/**
 * Memory Consolidation Service
 * Runs periodically to maintain memory quality:
 * - Merges near-duplicate memories
 * - Decays importance of unused memories
 * - Promotes frequently accessed memories
 */

const { generateEmbedding, cosineSimilarity } = require('./embeddings');

const DUPLICATE_THRESHOLD = 0.92;

/**
 * Run consolidation for a single agent
 */
async function consolidateAgent(agentId, db) {
    let merged = 0;
    let decayed = 0;
    let promoted = 0;

    // 1. Find and merge near-duplicates (within same type)
    const allMemories = await db.getAllActiveAgentMemories(agentId);

    for (const type of ['semantic', 'episodic', 'procedural']) {
        const typed = allMemories.filter(m => m.type === type && m.embedding);

        for (let i = 0; i < typed.length; i++) {
            if (!typed[i].is_active) continue; // May have been deactivated in this pass

            for (let j = i + 1; j < typed.length; j++) {
                if (!typed[j].is_active) continue;

                // Parse embeddings if stored as JSON text
                const embA = typeof typed[i].embedding === 'string'
                    ? JSON.parse(typed[i].embedding) : typed[i].embedding;
                const embB = typeof typed[j].embedding === 'string'
                    ? JSON.parse(typed[j].embedding) : typed[j].embedding;

                if (!embA || !embB) continue;

                const similarity = cosineSimilarity(embA, embB);
                if (similarity >= DUPLICATE_THRESHOLD) {
                    // Keep the one with higher importance, deactivate the other
                    const keeper = (typed[i].importance || 0) >= (typed[j].importance || 0) ? typed[i] : typed[j];
                    const loser = keeper === typed[i] ? typed[j] : typed[i];

                    await db.deactivateMemory(loser.id, keeper.id);
                    loser.is_active = false;
                    merged++;
                }
            }
        }
    }

    // 2. Decay unused memories (not accessed in 30+ days)
    const decayResult = await db.run(`
        UPDATE agent_memories
        SET importance = GREATEST(0.1, importance * 0.95),
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = $1
          AND is_active = TRUE
          AND last_accessed_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `, [agentId]);
    decayed = decayResult.rowCount || 0;

    // 3. Promote frequently accessed memories
    const promoteResult = await db.run(`
        UPDATE agent_memories
        SET importance = LEAST(1.0, importance * 1.05),
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = $1
          AND is_active = TRUE
          AND access_count > 10
          AND importance < 0.9
    `, [agentId]);
    promoted = promoteResult.rowCount || 0;

    return { merged, decayed, promoted };
}

/**
 * Run consolidation for all agents that have memories
 */
async function runConsolidationForAllAgents(db) {
    try {
        const agents = await db.all(`
            SELECT DISTINCT agent_id FROM agent_memories WHERE is_active = TRUE
        `);

        let totalStats = { merged: 0, decayed: 0, promoted: 0, agents: 0 };

        for (const { agent_id } of agents) {
            try {
                const stats = await consolidateAgent(agent_id, db);
                totalStats.merged += stats.merged;
                totalStats.decayed += stats.decayed;
                totalStats.promoted += stats.promoted;
                totalStats.agents++;
            } catch (err) {
                console.error(`[Consolidation] Error for agent ${agent_id}:`, err.message);
            }
        }

        if (totalStats.merged > 0 || totalStats.decayed > 0 || totalStats.promoted > 0) {
            console.log(`[Consolidation] Done: ${totalStats.agents} agents, ${totalStats.merged} merged, ${totalStats.decayed} decayed, ${totalStats.promoted} promoted`);
        }

        return totalStats;
    } catch (error) {
        console.error('[Consolidation] Failed:', error.message);
        return null;
    }
}

module.exports = {
    consolidateAgent,
    runConsolidationForAllAgents
};
