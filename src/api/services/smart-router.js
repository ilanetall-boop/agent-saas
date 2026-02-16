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
const { detectAction, handleAction, generateConnectionPrompt } = require('./n8n-integration');

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

// Complexity detection patterns - ORDER MATTERS (most specific first)
const PATTERNS = {
    // === HIGH PRIORITY: Specific content types ===
    ecommerce: [
        /\b(boutique|shop|e-?commerce|magasin|store)\b.*\b(en ligne|online)\b/i,
        /\b(vendre|sell|produit|product).*(en ligne|online|web)/i,
        /\b(panier|cart|checkout|paiement|payment)\b/i,
        /\b(shopify|woocommerce|prestashop)\b/i,
        /page.*produit|product.*page/i
    ],
    presentation: [
        /\b(présentation|presentation|powerpoint|ppt|slides?|diaporama)\b/i,
        /\b(slide deck|pitch deck|keynote)\b/i,
        /\b(créer?|crée|fais|faire).*(présentation|slides?|ppt)/i,
        /pour (ma |une )?(réunion|meeting|conf|pitch)/i
    ],
    socialMedia: [
        /\b(post|publication|contenu).*(linkedin|instagram|twitter|tiktok|facebook|réseaux?|social)/i,
        /\b(linkedin|instagram|twitter|tiktok|facebook)\b.*\b(post|publication|contenu)\b/i,
        /\b(réseaux? sociaux|social media)\b/i,
        /\b(caption|légende|hashtag)\b/i,
        /\b(reel|story|stories|thread|tweet)\b/i
    ],
    videoScript: [
        /\b(script|scénario).*(vidéo|video|youtube|tiktok)\b/i,
        /\b(youtube|tiktok|reels?)\b.*\b(script|scénario|idée)\b/i,
        /\b(intro|hook|outro|cta)\b.*vidéo/i,
        /\b(chaîne|channel)\b.*\b(youtube|vidéo)\b/i
    ],
    document: [
        /\b(devis|quote|facture|invoice)\b/i,
        /\b(contrat|contract)\b.*\b(freelance|prestation|service|travail)\b/i,
        /\b(lettre|letter).*(motivation|démission|recommandation)\b/i,
        /\b(cv|curriculum|résumé)\b/i,
        /\b(bon de commande|purchase order)\b/i
    ],
    website: [
        /\b(portfolio|site|website|landing.?page|webpage|page web)\b/i,
        /\b(créer?|crée|fais|faire|génère|build|make|write).*(site|portfolio|page)/i,
        /\b(html|css).*(complet|professionnel|moderne)/i,
        /\b(restaurant|boutique|shop|business|entreprise).*(site|web)/i,
        /besoin d'un site/i,
        /site.*professionnel/i
    ],
    code: [
        /\b(code|function|script|program|debug|error|bug|fix|fonction)\b/i,
        /\b(javascript|typescript|python|java|sql|api|json|react|node)\b/i,
        /```[\s\S]*```/,
        /\b(implement|develop|program|écris|écrire)\b/i,
        /\b(algorithme|variable|boucle|array|objet)\b/i
    ],
    analysis: [
        /\b(analy[sz]e|explain|compare|evaluate|review|analyser|expliquer)\b/i,
        /\b(summarize|summary|digest|résumé|résumer)\b/i,
        /\b(data|report|chart|graph|spreadsheet|données)\b/i
    ],
    complex: [
        /\b(architect|design|strategy|plan|roadmap|stratégie|architecture)\b/i,
        /\b(research|investigate|deep.dive|recherche|approfondir)\b/i,
        /step.by.step|étape par étape/i,
        /\b(complex|difficult|challenging|optimize|complexe|difficile)\b/i,
        /\b(refactor|rewrite|migrate|réécrire|migrer)\b/i
    ],
    translate: [
        /tradui[st]|translate/i,
        /en (français|anglais|espagnol|allemand)/i,
        /to (french|english|spanish|german)/i
    ],
    simple: [
        /^(hi|hello|hey|bonjour|salut|coucou)[\s!?]*$/i,
        /^(yes|no|ok|okay|sure|oui|non|d'accord)[\s!?]*$/i,
        /^(thanks?|merci)[\s!?]*$/i,
        /^(how are you|ça va|comment vas)/i,
        /^je m'appelle \w+$/i
    ]
};

/**
 * Analyze message complexity
 * Priority: ecommerce > presentation > socialMedia > videoScript > document > website > code > complex > analysis > translate > simple
 */
function analyzeComplexity(message) {
    const text = message.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // Check patterns in explicit priority order (most specific first)
    const priorityOrder = [
        'ecommerce',      // Boutiques en ligne
        'presentation',   // PowerPoint/Slides
        'socialMedia',    // Posts réseaux sociaux
        'videoScript',    // Scripts YouTube/TikTok
        'document',       // Devis, factures, contrats, CV
        'website',        // Sites web généraux
        'code',           // Code/programmation
        'complex',        // Tâches complexes
        'analysis',       // Analyse
        'translate',      // Traduction
        'simple'          // Conversations simples
    ];

    for (const complexity of priorityOrder) {
        const patterns = PATTERNS[complexity];
        if (patterns) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return complexity;
                }
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
        ecommerce: 'code',      // E-commerce needs full code
        presentation: 'code',   // Presentations need structured output
        socialMedia: 'chat',    // Social posts are text-based
        videoScript: 'chat',    // Scripts are text-based
        document: 'chat',       // Documents are text-based
        website: 'code',        // Website creation needs full code capability
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

    // For code/website tasks, require actual code capability (no chat fallback)
    const strictCapabilities = ['code', 'website', 'analysis', 'complex'];
    const isStrict = strictCapabilities.includes(complexity);

    for (const [providerName, provider] of Object.entries(PROVIDERS)) {
        for (const [modelName, config] of Object.entries(provider.models)) {
            const hasCapability = config.capabilities.includes(requiredCapability);
            const hasChatFallback = !isStrict && config.capabilities.includes('chat');

            if (allowedTiers.includes(config.tier) && (hasCapability || hasChatFallback)) {
                const cost = MODEL_COSTS[modelName];
                candidates.push({
                    provider: providerName,
                    model: modelName,
                    tier: config.tier,
                    cost: cost ? cost.input + cost.output : 999,
                    hasExactCapability: hasCapability
                });
            }
        }
    }

    // Prefer models with exact capability match
    candidates.sort((a, b) => {
        if (a.hasExactCapability && !b.hasExactCapability) return -1;
        if (!a.hasExactCapability && b.hasExactCapability) return 1;
        return a.cost - b.cost;
    });

    // Return best model (already sorted by capability match, then cost)
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
        skipCache = false,
        baseUrl = process.env.BASE_URL || ''
    } = options;

    const startTime = Date.now();
    let usedCache = false;
    let cacheEntryId = null;

    // 0. Check if this is an ACTION request (Gmail, Calendar, etc.)
    const actionDetection = detectAction(message);

    if (actionDetection.isAction) {
        console.log(`[SmartRouter] ACTION detected: ${actionDetection.service}/${actionDetection.action}`);

        // Handle the action via N8N
        const actionResult = await handleAction(
            userId,
            actionDetection.service,
            actionDetection.action,
            { message, language },
            db,
            baseUrl
        );

        if (actionResult.needsConnection) {
            // User needs to connect the service first - include OAuth URL
            return {
                success: true,
                content: actionResult.message,
                isAction: true,
                needsConnection: true,
                connectionData: {
                    service: actionDetection.service,
                    serviceName: actionResult.serviceName,
                    icon: actionResult.icon,
                    oauthUrl: actionResult.oauthUrl,
                    button: actionResult.button
                },
                model: 'action-router',
                provider: 'n8n',
                cost: 0,
                routing: {
                    complexity: 'action',
                    tier: 'action',
                    userTier,
                    latency: Date.now() - startTime
                }
            };
        }

        if (actionResult.success) {
            // Action executed successfully
            return {
                success: true,
                content: formatActionResult(actionResult),
                isAction: true,
                actionResult,
                model: 'action-router',
                provider: 'n8n',
                cost: 0,
                routing: {
                    complexity: 'action',
                    tier: 'action',
                    userTier,
                    latency: Date.now() - startTime
                }
            };
        }

        // Action failed, let Eva handle it with context
        console.log(`[SmartRouter] Action failed, falling back to AI: ${actionResult.message}`);
    }

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

    // 2.5. Enhance system prompt for specific tasks
    let enhancedPrompt = systemPrompt || '';

    if (complexity === 'website') {
        enhancedPrompt += `

INSTRUCTION CRITIQUE - SITE WEB:
Tu dois IMMÉDIATEMENT générer le code HTML/CSS COMPLET. PAS de description, PAS de plan, PAS de question.
Commence directement par \`\`\`html et génère un site de 200+ lignes avec:
- Nav sticky + Hero gradient + Stats + Services cards + Testimonials + Contact form + Footer
- CSS moderne: :root variables, flexbox/grid, transitions, responsive
- Images: https://picsum.photos/600/400?random=X`;
    }

    if (complexity === 'code') {
        enhancedPrompt += `

INSTRUCTION CODE:
Génère le code IMMÉDIATEMENT. Pas d'explication avant. Code d'abord, explications courtes après si nécessaire.`;
    }

    if (complexity === 'ecommerce') {
        enhancedPrompt += `

INSTRUCTION E-COMMERCE:
Génère une boutique en ligne COMPLÈTE en HTML/CSS/JS avec:
- Header avec logo, recherche, panier
- Grille de produits avec images, prix, boutons "Ajouter au panier"
- Sidebar filtres (catégories, prix, tailles)
- Page produit détaillée avec galerie, description, avis
- Panier fonctionnel avec localStorage
- Design moderne type Shopify
- Images: https://picsum.photos/400/400?random=X
Minimum 300 lignes de code.`;
    }

    if (complexity === 'presentation') {
        enhancedPrompt += `

INSTRUCTION PRÉSENTATION/SLIDES:
Génère une présentation HTML complète avec reveal.js intégré:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.min.css">
<style>
.reveal h1 { color: #2563eb; }
.reveal h2 { color: #1e40af; }
.reveal ul { text-align: left; }
.stat-big { font-size: 3em; color: #2563eb; font-weight: bold; }
</style>
</head>
<body>
<div class="reveal">
<div class="slides">
<!-- SLIDES ICI -->
</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.min.js"></script>
<script>Reveal.initialize();</script>
</body>
</html>
\`\`\`
Structure: Titre > Agenda > 5-8 slides contenu > Conclusion > Questions
Chaque slide: 1 titre + 3-5 bullet points MAX ou 1 image/stat`;
    }

    if (complexity === 'socialMedia') {
        enhancedPrompt += `

INSTRUCTION POST RÉSEAUX SOCIAUX:
Génère le contenu adapté à la plateforme:

LINKEDIN:
- Hook accrocheur (1ère ligne cruciale)
- 3-5 paragraphes courts
- Émojis professionnels ✅📈💡
- Call-to-action final
- 3-5 hashtags pertinents

INSTAGRAM:
- Caption engageante
- Émojis visuels 🔥✨💪
- Story telling
- Call-to-action
- 20-30 hashtags (en commentaire)

TWITTER/X:
- 280 caractères MAX
- Percutant et direct
- 1-2 hashtags
- Thread si nécessaire (numérote 1/, 2/, etc.)

TIKTOK:
- Script court et dynamique
- Hook dans les 3 premières secondes
- Tendances/sons suggérés
- Hashtags viraux`;
    }

    if (complexity === 'videoScript') {
        enhancedPrompt += `

INSTRUCTION SCRIPT VIDÉO:
Génère un script structuré:

FORMAT:
\`\`\`
🎬 TITRE: [Titre accrocheur]
⏱️ DURÉE: [X minutes]
🎯 OBJECTIF: [But de la vidéo]

---
HOOK (0-5 sec):
[Phrase choc pour capter l'attention]

INTRO (5-15 sec):
[Présentation du sujet]

CONTENU PRINCIPAL:
Point 1: [Titre]
- [Détails]
- [B-roll suggéré]

Point 2: [Titre]
- [Détails]
- [B-roll suggéré]

Point 3: [Titre]
- [Détails]
- [B-roll suggéré]

CONCLUSION:
[Résumé]

CTA (Call-to-Action):
[Like, abonne-toi, commente...]

---
📝 NOTES DE PRODUCTION:
- Musique suggérée: [type]
- Transitions: [style]
- Miniature: [description]
\`\`\``;
    }

    if (complexity === 'document') {
        enhancedPrompt += `

INSTRUCTION DOCUMENT PRO:
GÉNÈRE IMMÉDIATEMENT le document complet. PAS de questions, PAS de clarifications.
Document HTML imprimable avec CSS print-friendly:

DEVIS/FACTURE:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
@media print { body { margin: 0; } }
body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
.header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
.logo { font-size: 24px; font-weight: bold; color: #2563eb; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f8f9fa; }
.total { font-size: 1.5em; text-align: right; margin-top: 20px; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
</style>
</head>
<body>
<!-- CONTENU -->
</body>
</html>
\`\`\`

CONTRAT:
- En-tête avec parties
- Articles numérotés
- Clauses standard (objet, durée, prix, résiliation)
- Zone signature

CV:
- Design moderne
- Sections: Contact, Profil, Expérience, Formation, Compétences
- 1 page A4 max`;
    }

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
                enhancedPrompt
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

/**
 * Format action result into a human-readable response
 */
function formatActionResult(actionResult) {
    const { service, action, result } = actionResult;

    // Helper to format emails (handles both single object and array)
    const formatEmails = (emails) => {
        if (!emails) return 'Aucun email trouvé';
        const emailList = Array.isArray(emails) ? emails : [emails];
        return emailList.map(e => `• **${e.From || e.from || 'Inconnu'}**: ${e.Subject || e.subject || 'Sans sujet'}`).join('\n');
    };

    const templates = {
        gmail: {
            sort: `📧 J'ai trié tes mails!\n\n${result?.summary || 'Mails organisés avec succès.'}`,
            send: `📧 Mail envoyé avec succès à ${result?.recipient || result?.to || 'destinataire'}!`,
            search: `📧 Résultats de recherche:\n${formatEmails(result?.results || result?.emails)}`,
            list: `📧 Voici tes derniers mails:\n\n${formatEmails(result?.emails)}`,
            read: `📧 Voici tes derniers mails:\n\n${formatEmails(result?.emails)}`
        },
        calendar: {
            create: `📅 Événement créé: "${result?.title || 'Nouvel événement'}" le ${result?.date || ''}`,
            list: `📅 Tes prochains événements:\n${result?.events?.map(e => `• ${e.date}: ${e.title}`).join('\n') || 'Aucun événement'}`
        },
        drive: {
            list: `📁 Fichiers dans Drive:\n${result?.files?.map(f => `• ${f.name}`).join('\n') || 'Aucun fichier'}`,
            upload: `📁 Fichier "${result?.fileName || 'fichier'}" uploadé avec succès!`
        },
        slack: {
            send: `💬 Message envoyé sur #${result?.channel || 'channel'}!`
        }
    };

    return templates[service]?.[action] || `✅ Action "${action}" exécutée sur ${service} avec succès!`;
}

module.exports = {
    route,
    analyzeComplexity,
    selectModel,
    PROVIDERS,
    detectAction
};
