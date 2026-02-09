const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey
});

/**
 * Generate a response from Claude
 */
async function generateResponse({ systemPrompt, messages, memory = {}, model = config.defaultModel }) {
    // Build context from memory
    let memoryContext = '';
    if (Object.keys(memory).length > 0) {
        memoryContext = '\n\nCe que tu sais sur cette personne:\n';
        for (const [key, value] of Object.entries(memory)) {
            memoryContext += `- ${key}: ${value}\n`;
        }
    }

    const fullSystemPrompt = systemPrompt + memoryContext;

    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens: 500, // Limité pour des réponses courtes
            system: fullSystemPrompt,
            messages: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        });

        return {
            success: true,
            content: response.content[0].text,
            usage: response.usage
        };
    } catch (error) {
        console.error('Claude API error:', error);
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
