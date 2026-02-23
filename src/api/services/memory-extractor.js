/**
 * Memory Extractor Service
 * Analyzes conversation exchanges and extracts new memories using LLM.
 * Uses the cheapest available model (Haiku) to minimize costs.
 * Runs asynchronously after the chat response is sent.
 */

const { nanoid } = require('nanoid');
const { generateEmbedding } = require('./embeddings');

const EXTRACTION_ENABLED = process.env.MEMORY_EXTRACTION_ENABLED === 'true';

// Rate limiting: track extractions per agent
const extractionCounts = new Map(); // agentId -> { count, resetAt }
const MAX_EXTRACTIONS_PER_HOUR = 10;

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the following conversation exchange and extract any new facts, events, or behavioral preferences worth remembering about the USER (not the assistant).

Respond in JSON format ONLY (no markdown, no explanation):
{
  "memories": [
    {
      "type": "semantic|episodic|procedural",
      "content": "concise factual statement",
      "importance": 0.3-1.0,
      "category": "optional category for procedural memories"
    }
  ]
}

Rules:
- semantic: Facts about the person (name, job, location, skills, goals, family, interests)
- episodic: Specific events or requests (what they asked for, what was accomplished, problems encountered)
- procedural: Communication preferences, interaction style, recurring patterns (language preference, formality level, design taste)
- importance: 0.9+ for core identity (name, job), 0.6-0.8 for goals/preferences, 0.3-0.5 for minor details
- DO NOT extract trivial greetings, generic statements, or assistant's own info
- Keep each memory to 1-2 sentences max
- If nothing worth remembering, return {"memories": []}
- Content MUST be in the same language as the conversation`;

/**
 * Extract memories from a conversation exchange
 * @param {string} userMessage
 * @param {string} assistantResponse
 * @param {Array} existingMemories - Current active memories for dedup
 * @param {string} agentId
 * @param {string} conversationId
 * @param {object} db - Database module
 * @returns {Promise<Array>} Extracted memories
 */
async function extractMemories(userMessage, assistantResponse, existingMemories, agentId, conversationId, db) {
    if (!EXTRACTION_ENABLED) return [];

    // Skip trivial exchanges
    if (userMessage.length < 20 && assistantResponse.length < 50) return [];

    // Rate limiting
    if (!checkRateLimit(agentId)) {
        console.log(`[MemoryExtractor] Rate limit reached for agent ${agentId}`);
        return [];
    }

    try {
        // Build existing memories context to avoid duplicates
        const existingContext = existingMemories
            .map(m => `[${m.type}] ${m.content}`)
            .join('\n');

        const prompt = `${EXTRACTION_PROMPT}

EXISTING MEMORIES (do NOT duplicate these):
${existingContext || 'None yet'}

CONVERSATION EXCHANGE:
User: ${userMessage}
Assistant: ${assistantResponse}

Extract new memories:`;

        // Call cheapest model (Haiku)
        const result = await callExtractionModel(prompt);
        if (!result) return [];

        // Parse JSON response
        const parsed = parseExtractionResult(result);
        if (!parsed || parsed.length === 0) return [];

        // Store each new memory (with dedup check)
        const stored = [];
        for (const memory of parsed) {
            // Generate embedding
            const embResult = await generateEmbedding(memory.content);
            const embedding = embResult ? embResult.embedding : null;

            // Check for semantic duplicates
            if (embedding) {
                const isDuplicate = await checkDuplicate(agentId, memory.type, embedding, db);
                if (isDuplicate) continue;
            }

            await db.createAgentMemory(nanoid(), agentId, memory.type, memory.content, embedding, {
                source: 'conversation',
                importance: memory.importance || 0.5,
                eventDate: memory.type === 'episodic' ? new Date() : null,
                category: memory.category || null,
                conversationId
            });

            stored.push(memory);
        }

        if (stored.length > 0) {
            console.log(`[MemoryExtractor] Extracted ${stored.length} memories for agent ${agentId}`);
        }
        return stored;
    } catch (error) {
        console.error('[MemoryExtractor] Extraction failed:', error.message);
        return [];
    }
}

/**
 * Call the cheapest available LLM for extraction
 */
async function callExtractionModel(prompt) {
    // Try Haiku first (cheapest Anthropic model)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const Anthropic = require('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const response = await client.messages.create({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
            });

            return response.content[0].text;
        } catch (error) {
            console.warn('[MemoryExtractor] Haiku failed:', error.message);
        }
    }

    // Fallback: GPT-4o-mini (also very cheap)
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'OpenAI error');
            return data.choices[0].message.content;
        } catch (error) {
            console.warn('[MemoryExtractor] GPT-4o-mini failed:', error.message);
        }
    }

    return null;
}

/**
 * Parse LLM JSON response, handling common formatting issues
 */
function parseExtractionResult(text) {
    try {
        // Strip markdown code blocks if present
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleaned);
        if (!parsed.memories || !Array.isArray(parsed.memories)) return [];

        // Validate each memory
        return parsed.memories.filter(m =>
            m.type && ['semantic', 'episodic', 'procedural'].includes(m.type) &&
            m.content && typeof m.content === 'string' && m.content.length > 5
        ).map(m => ({
            type: m.type,
            content: m.content.substring(0, 500),
            importance: Math.max(0.1, Math.min(1.0, m.importance || 0.5)),
            category: m.category || null
        }));
    } catch (error) {
        console.warn('[MemoryExtractor] Failed to parse LLM response:', error.message);
        return [];
    }
}

/**
 * Check if a new memory is a duplicate of an existing one
 */
async function checkDuplicate(agentId, type, embedding, db) {
    const similar = await db.searchAgentMemories(agentId, embedding, {
        limit: 1,
        types: [type],
        minSimilarity: 0.92
    });
    return similar.length > 0;
}

/**
 * Rate limiting: max N extractions per hour per agent
 */
function checkRateLimit(agentId) {
    const now = Date.now();
    const entry = extractionCounts.get(agentId);

    if (!entry || now > entry.resetAt) {
        extractionCounts.set(agentId, { count: 1, resetAt: now + 3600000 });
        return true;
    }

    if (entry.count >= MAX_EXTRACTIONS_PER_HOUR) return false;

    entry.count++;
    return true;
}

module.exports = {
    extractMemories,
    parseExtractionResult
};
