const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const aiRouter = require('../ai-router');

const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey
});

/**
 * Generate a response - uses AI Router for smart model selection
 * 
 * @param {Object} options
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Conversation history
 * @param {Object} options.memory - User memory/context
 * @param {string} options.model - Force specific model (optional)
 * @param {string} options.userTier - User tier: 'free', 'pro', 'business', 'vip' (default: 'free')
 * @param {boolean} options.useRouter - Use AI router for model selection (default: true)
 */
async function generateResponse({ 
    systemPrompt, 
    messages, 
    memory = {}, 
    model = null,
    userTier = 'free',
    useRouter = true 
}) {
    // Build context from memory
    let memoryContext = '';
    if (Object.keys(memory).length > 0) {
        memoryContext = '\n\nCe que tu sais sur cette personne:\n';
        for (const [key, value] of Object.entries(memory)) {
            memoryContext += `- ${key}: ${value}\n`;
        }
    }

    const fullSystemPrompt = systemPrompt + memoryContext;
    
    // Get the last user message for routing analysis
    const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

    try {
        // Use AI Router for smart model selection
        if (useRouter && !model) {
            const routerResult = await aiRouter.route(lastMessage, messages.slice(0, -1), {
                userTier,
                systemPrompt: fullSystemPrompt
            });
            
            console.log(`[AI Router] Model: ${routerResult.model} | Complexity: ${routerResult.routing.complexity} | Tier: ${userTier}`);
            
            return {
                success: true,
                content: routerResult.content,
                usage: routerResult.usage,
                routing: routerResult.routing,
                model: routerResult.model,
                provider: routerResult.provider
            };
        }
        
        // Fallback: Direct Claude call (legacy behavior)
        const response = await anthropic.messages.create({
            model: model || config.defaultModel,
            max_tokens: 4000,
            system: fullSystemPrompt,
            messages: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        });

        return {
            success: true,
            content: response.content[0].text,
            usage: response.usage,
            model: model || config.defaultModel,
            provider: 'anthropic'
        };
    } catch (error) {
        console.error('AI generation error:', error);
        
        // If router fails, try direct Claude as fallback
        if (useRouter && !model) {
            console.log('[AI Router] Fallback to direct Claude due to error');
            try {
                const fallbackResponse = await anthropic.messages.create({
                    model: config.defaultModel,
                    max_tokens: 4000,
                    system: fullSystemPrompt,
                    messages: messages.map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                });
                
                return {
                    success: true,
                    content: fallbackResponse.content[0].text,
                    usage: fallbackResponse.usage,
                    model: config.defaultModel,
                    provider: 'anthropic',
                    fallback: true
                };
            } catch (fallbackError) {
                console.error('Fallback Claude error:', fallbackError);
            }
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Default system prompt - friendly & concise
 */
function getDefaultSystemPrompt(agentName, userName) {
    const name = agentName || 'Alex';
    const user = userName || null;
    
    let prompt = `Tu es ${name}, un assistant IA personnel sympa et efficace.

RÈGLES IMPORTANTES:
- Réponses COURTES (2-3 phrases max sauf si on te demande plus)
- Ton chaleureux, comme un pote qui aide
- Tutoiement toujours
- Pas de listes à rallonge
- Pas de "Je suis désolé" ou "En tant qu'IA"
- Direct et concret

`;

    if (!user) {
        prompt += `C'est la PREMIÈRE conversation. Commence par te présenter brièvement et demande son prénom. Sois accueillant mais pas trop long.`;
    } else {
        prompt += `Tu parles avec ${user}. Sois naturel et utile.`;
    }

    return prompt;
}

/**
 * Onboarding system prompt
 */
function getOnboardingPrompt(step, memory = {}) {
    const name = memory.name || 'toi';
    
    const prompts = {
        0: `Tu es Alex. Dis juste: "Hey ! Moi c'est Alex, ton nouvel assistant. Et toi, c'est quoi ton petit nom ?" RIEN D'AUTRE.`,
        
        1: `Tu es Alex. L'utilisateur s'appelle ${name}. Dis EXACTEMENT: "Enchanté ${name} ! Tu fais quoi dans la vie ?" RIEN D'AUTRE.`,
        
        2: `Tu es Alex. Tu parles à ${name}. Dis EXACTEMENT: "Cool ! Et c'est quoi ton plus gros défi en ce moment ?" RIEN D'AUTRE.`,
        
        3: `Tu es Alex. Tu parles à ${name}. Dis EXACTEMENT: "Je vois. Si je pouvais faire UN truc pour toi là maintenant, ce serait quoi ?" RIEN D'AUTRE.`,
        
        4: `Tu es Alex. Tu parles à ${name}. Dis EXACTEMENT: "Parfait ${name}, j'ai compris ! Je suis prêt à t'aider. Demande-moi ce que tu veux." RIEN D'AUTRE.`,
        
        5: `Tu es Alex, assistant de ${name}. Réponds de façon courte et utile.`
    };
    
    return prompts[step] || prompts[5];
}

module.exports = {
    generateResponse,
    getDefaultSystemPrompt,
    getOnboardingPrompt
};
