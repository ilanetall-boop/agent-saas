/**
 * Smart AI Router v2
 * Intelligent routing with cache, cost optimization, and fallback
 *
 * Flow:
 * 1. Check semantic cache → if hit, return (cost ≈ $0)
 * 2. Analyze complexity → select cheapest capable model
 * 3. Call model with automatic fallback on error
 * 4. Track costs → ensure 30%+ margin
 * 5. Store in cache → for future reuse
 */

const { searchCache, storeInCache, recordCacheHit } = require('./knowledge-cache');
const { trackRequest, calculateCost, MODEL_COSTS } = require('./cost-tracker');

// Provider configurations
const PROVIDERS = {
    anthropic: {
        models: {
            'claude-3-5-haiku-20241022': { tier: 'cheap', capabilities: ['chat', 'code-simple'] },
            'claude-3-5-sonnet-20241022': { tier: 'mid', capabilities: ['chat', 'code', 'analysis'] },
            'claude-opus-4-5': { tier: 'premium', capabilities: ['chat', 'code', 'analysis', 'complex', 'reasoning'] }
        },
        call: callAnthropic
    },
    openai: {
        models: {
            'gpt-4o-mini': { tier: 'cheap', capabilities: ['chat', 'code-simple'] },
            'gpt-4o': { tier: 'mid', capabilities: ['chat', 'code', 'analysis'] },
            'gpt-4-turbo-preview': { tier: 'premium', capabilities: ['chat', 'code', 'analysis', 'complex'] }
        },
        call: callOpenAI
    },
    mistral: {
        models: {
            'mistral-small-latest': { tier: 'free', capabilities: ['chat', 'translate'] },
            'mistral-medium-latest': { tier: 'cheap', capabilities: ['chat', 'code-simple'] },
            'mistral-large-latest': { tier: 'mid', capabilities: ['chat', 'code', 'analysis'] }
        },
        call: callMistral
    },
    google: {
        models: {
            'gemini-1.5-flash': { tier: 'free', capabilities: ['chat', 'code-simple'] },
            'gemini-1.5-pro': { tier: 'mid', capabilities: ['chat', 'code', 'analysis', 'long-context'] }
        },
        call: callGemini
    }
};

// Complexity detection patterns
const PATTERNS = {
    simple: [
        /^(hi|hello|hey|bonjour|salut|coucou)/i,
        /^(yes|no|ok|okay|sure|oui|non|d'accord)/i,
        /^thanks?|merci/i,
        /how are you|ça va|comment vas/i
    ],
    translate: [
        /tradui[st]|translate/i,
        /en (français|anglais|espagnol|allemand)/i,
        /to (french|english|spanish|german)/i
    ],
    code: [
        /\b(code|function|script|program|debug|error|bug|fix)\b/i,
        /\b(javascript|typescript|python|java|html|css|sql|api|json|react|node)\b/i,
        /```[\s\S]*```/,
        /\b(créer?|build|make|write|implement).*(app|site|website|component)\b/i
    ],
    analysis: [
        /\b(analy[sz]e|explain|compare|evaluate|review)\b/i,
        /\b(summarize|summary|digest|résumé)\b/i,
        /\b(data|report|chart|graph|spreadsheet)\b/i
    ],
    complex: [
        /\b(architect|design|strategy|plan|roadmap)\b/i,
        /\b(research|investigate|deep.dive)\b/i,
        /step.by.step/i,
        /\b(complex|difficult|challenging|optimize)\b/i,
        /\b(refactor|rewrite|migrate)\b/i
    ]
};

/**
 * Analyze message complexity
 */
function analyzeComplexity(message) {
    const text = message.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // Check patterns in order of priority
    for (const [complexity, patterns] of Object.entries(PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return complexity;
            }
        }
    }

    // Length-based fallback
    if (wordCount > 200) return 'complex';
    if (wordCount > 100) return 'analysis';
    if (wordCount > 50) return 'code';

    return 'simple';
}

/**
 * Select the cheapest model capable of handling the task
 */
function selectModel(complexity, userTier = 'free') {
    // Map complexity to required capability
    const capabilityMap = {
        simple: 'chat',
        translate: 'translate',
        code: 'code',
        'code-simple': 'code-simple',
        analysis: 'analysis',
        complex: 'complex'
    };

    const requiredCapability = capabilityMap[complexity] || 'chat';

    // Tier restrictions
    const allowedTiers = userTier === 'pro'
        ? ['free', 'cheap', 'mid', 'premium']
        : ['free', 'cheap', 'mid']; // Free users don't get premium

    // Find all capable models
    const candidates = [];

    for (const [providerName, provider] of Object.entries(PROVIDERS)) {
        for (const [modelName, config] of Object.entries(provider.models)) {
            if (allowedTiers.includes(config.tier) &&
                (config.capabilities.includes(requiredCapability) ||
                 config.capabilities.includes('chat'))) { // chat is fallback
                const cost = MODEL_COSTS[modelName];
                candidates.push({
                    provider: providerName,
                    model: modelName,
                    tier: config.tier,
                    cost: cost ? cost.input + cost.output : 999
                });
            }
        }
    }

    // Sort by cost (cheapest first)
    candidates.sort((a, b) => a.cost - b.cost);

    // Return cheapest capable model
    return candidates[0] || {
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        tier: 'cheap'
    };
}

/**
 * Main routing function with cache, cost tracking, and fallback
 */
async function route(message, conversationHistory = [], options = {}, db = null) {
    const {
        userTier = 'free',
        userId = null,
        systemPrompt = null,
        language = 'en',
        forceModel = null,
        skipCache = false
    } = options;

    const startTime = Date.now();
    let usedCache = false;
    let cacheEntryId = null;

    // 1. Check semantic cache (unless skipped)
    if (!skipCache && db) {
        const cacheResult = await searchCache(message);

        if (cacheResult.hit) {
            // Cache hit! Return cached answer
            await recordCacheHit(cacheResult.entryId, db);

            // Track as cache hit (minimal cost)
            if (userId && db) {
                await trackRequest({
                    userId,
                    requestType: 'chat',
                    provider: 'cache',
                    model: 'knowledge-cache',
                    inputTokens: 0,
                    outputTokens: 0,
                    fromCache: true,
                    cacheHitId: cacheResult.entryId
                }, db);
            }

            console.log(`[SmartRouter] CACHE HIT (${(cacheResult.similarity * 100).toFixed(1)}%) - Cost: $${cacheResult.embeddingCost.toFixed(6)}`);

            return {
                success: true,
                content: cacheResult.answer,
                model: 'cache',
                provider: 'knowledge-cache',
                fromCache: true,
                similarity: cacheResult.similarity,
                cost: cacheResult.embeddingCost,
                routing: {
                    complexity: cacheResult.category || 'cached',
                    tier: 'cache',
                    userTier,
                    latency: Date.now() - startTime
                }
            };
        }
    }

    // 2. Analyze complexity and select model
    const complexity = analyzeComplexity(message);
    const selected = forceModel
        ? { provider: getProviderForModel(forceModel), model: forceModel }
        : selectModel(complexity, userTier);

    console.log(`[SmartRouter] Complexity: ${complexity} → Model: ${selected.provider}/${selected.model}`);

    // 3. Build messages array
    const messages = [
        ...conversationHistory,
        { role: 'user', content: message }
    ];

    // 4. Call model with fallback
    let result = null;
    let lastError = null;
    const fallbackOrder = getFallbackOrder(selected.provider);

    for (const providerName of fallbackOrder) {
        const provider = PROVIDERS[providerName];
        if (!provider) continue;

        try {
            result = await provider.call(
                selected.model.includes(providerName) ? selected.model : getDefaultModel(providerName),
                messages,
                systemPrompt
            );
            break; // Success, exit loop
        } catch (error) {
            console.warn(`[SmartRouter] ${providerName} failed: ${error.message}`);
            lastError = error;
            // Continue to next provider
        }
    }

    if (!result) {
        throw lastError || new Error('All providers failed');
    }

    // 5. Track costs
    const cost = calculateCost(result.model, result.usage?.inputTokens || 0, result.usage?.outputTokens || 0);

    if (userId && db) {
        await trackRequest({
            userId,
            requestType: 'chat',
            provider: result.provider,
            model: result.model,
            inputTokens: result.usage?.inputTokens || 0,
            outputTokens: result.usage?.outputTokens || 0,
            fromCache: false
        }, db);
    }

    // 6. Store in cache for future reuse
    if (db && !skipCache) {
        await storeInCache({
            question: message,
            answer: result.content,
            category: complexity,
            model: result.model,
            cost,
            userId,
            language
        }, db);
    }

    const latency = Date.now() - startTime;
    console.log(`[SmartRouter] Response in ${latency}ms | Cost: $${cost.toFixed(6)} | Model: ${result.model}`);

    return {
        success: true,
        content: result.content,
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        cost,
        fromCache: false,
        routing: {
            complexity,
            tier: selected.tier,
            userTier,
            latency
        }
    };
}

// === Provider Call Functions ===

async function callAnthropic(model, messages, systemPrompt) {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt || 'You are a helpful AI assistant.',
        messages: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }))
    });

    return {
        content: response.content[0].text,
        model,
        provider: 'anthropic',
        usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
        }
    };
}

async function callOpenAI(model, messages, systemPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [
                { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                ...messages
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI error');

    return {
        content: data.choices[0].message.content,
        model,
        provider: 'openai',
        usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens
        }
    };
}

async function callMistral(model, messages, systemPrompt) {
    if (!process.env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY not configured');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [
                { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
                ...messages
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Mistral error');

    return {
        content: data.choices[0].message.content,
        model,
        provider: 'mistral',
        usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens
        }
    };
}

async function callGemini(model, messages, systemPrompt) {
    if (!process.env.GOOGLE_SA_KEY) throw new Error('GOOGLE_SA_KEY not configured');

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_SA_KEY);
    const gemini = genAI.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));

    const chat = gemini.startChat({
        history,
        generationConfig: { maxOutputTokens: 4096 }
    });

    const lastMessage = messages[messages.length - 1].content;
    const prompt = systemPrompt ? `${systemPrompt}\n\n${lastMessage}` : lastMessage;
    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    return {
        content: response.text(),
        model,
        provider: 'google',
        usage: {
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
}

// === Helper Functions ===

function getProviderForModel(model) {
    for (const [providerName, provider] of Object.entries(PROVIDERS)) {
        if (Object.keys(provider.models).includes(model)) {
            return providerName;
        }
    }
    return 'anthropic';
}

function getDefaultModel(provider) {
    const defaults = {
        anthropic: 'claude-3-5-haiku-20241022',
        openai: 'gpt-4o-mini',
        mistral: 'mistral-small-latest',
        google: 'gemini-1.5-flash'
    };
    return defaults[provider] || 'claude-3-5-haiku-20241022';
}

function getFallbackOrder(primary) {
    const all = ['anthropic', 'openai', 'mistral', 'google'];
    return [primary, ...all.filter(p => p !== primary)];
}

module.exports = {
    route,
    analyzeComplexity,
    selectModel,
    PROVIDERS
};
