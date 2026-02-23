#!/usr/bin/env node
/**
 * Backfill Memory Embeddings
 *
 * Migrates existing legacy memories (key-value) to the new tri-type system
 * and generates embeddings for all agent_memories that lack them.
 *
 * Usage: node src/api/scripts/backfill-memory-embeddings.js
 *
 * Requires: DATABASE_URL and OPENAI_API_KEY environment variables
 */

require('dotenv').config();

const { initDb, all, run } = require('../db/db');
const { generateEmbedding, generateEmbeddings } = require('../services/embeddings');
const { nanoid } = require('nanoid');

async function migrateLegacyMemories() {
    console.log('--- Step 1: Migrate legacy memories to agent_memories ---');

    const legacyMemories = await all('SELECT * FROM memories');
    console.log(`Found ${legacyMemories.length} legacy memories`);

    let migrated = 0;
    let skipped = 0;

    for (const memory of legacyMemories) {
        const { agent_id, key, value, created_at } = memory;

        // Skip meta keys
        if (key === 'onboarding_step') {
            skipped++;
            continue;
        }

        // Check if already migrated
        const existing = await all(
            `SELECT id FROM agent_memories WHERE agent_id = $1 AND source = 'onboarding' AND content LIKE $2`,
            [agent_id, `%${key}%`]
        );
        if (existing.length > 0) {
            skipped++;
            continue;
        }

        // Classify memory type and importance
        let type = 'semantic';
        let importance = 0.5;
        let content;

        switch (key) {
            case 'name':
                type = 'semantic';
                importance = 0.95;
                content = `Son prenom est ${value}`;
                break;
            case 'job':
                type = 'semantic';
                importance = 0.9;
                content = `Profession/activite: ${value}`;
                break;
            case 'challenge':
                type = 'semantic';
                importance = 0.8;
                content = `Son defi principal: ${value}`;
                break;
            case 'first_need':
                type = 'episodic';
                importance = 0.7;
                content = `Premier besoin exprime: ${value}`;
                break;
            default:
                content = `${key}: ${value}`;
                break;
        }

        await run(`
            INSERT INTO agent_memories (id, agent_id, type, content, source, importance, created_at)
            VALUES ($1, $2, $3, $4, 'onboarding', $5, $6)
        `, [nanoid(), agent_id, type, content, importance, created_at]);
        migrated++;
    }

    console.log(`Migrated: ${migrated}, Skipped: ${skipped}`);
    return migrated;
}

async function backfillEmbeddings() {
    console.log('\n--- Step 2: Backfill embeddings for agent_memories ---');

    const memoriesWithout = await all(`
        SELECT id, content FROM agent_memories
        WHERE embedding IS NULL AND is_active = TRUE
    `);

    console.log(`Found ${memoriesWithout.length} memories without embeddings`);

    if (memoriesWithout.length === 0) {
        console.log('Nothing to backfill.');
        return 0;
    }

    let processed = 0;
    const batchSize = 50;

    for (let i = 0; i < memoriesWithout.length; i += batchSize) {
        const batch = memoriesWithout.slice(i, i + batchSize);
        const texts = batch.map(m => m.content);

        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(memoriesWithout.length / batchSize)} (${batch.length} items)...`);

        const result = await generateEmbeddings(texts);
        if (!result) {
            console.error('Embedding generation failed for batch, skipping...');
            continue;
        }

        for (let j = 0; j < batch.length; j++) {
            const embeddingStr = `[${result.embeddings[j].join(',')}]`;
            await run(
                'UPDATE agent_memories SET embedding = $1 WHERE id = $2',
                [embeddingStr, batch[j].id]
            );
            processed++;
        }

        console.log(`  Batch done. Total cost so far: $${result.cost.toFixed(6)}`);

        // Rate limit: 200ms between batches
        if (i + batchSize < memoriesWithout.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    console.log(`Backfilled embeddings for ${processed} memories`);
    return processed;
}

async function main() {
    console.log('=== Memory Backfill Script ===\n');

    try {
        await initDb();
        console.log('Database connected.\n');

        const migrated = await migrateLegacyMemories();
        const backfilled = await backfillEmbeddings();

        console.log(`\n=== Done ===`);
        console.log(`Legacy memories migrated: ${migrated}`);
        console.log(`Embeddings generated: ${backfilled}`);

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
