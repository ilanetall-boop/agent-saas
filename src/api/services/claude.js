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
    const prompts = {
        0: `Tu es Alex. C'est ta première rencontre avec cette personne. 
Dis juste: "Hey ! Moi c'est Alex, ton nouvel assistant. Et toi, c'est quoi ton petit nom ?"
RIEN D'AUTRE. Une seule phrase.`,
        
        1: `L'utilisateur vient de te donner son prénom. 
Réponds: "Enchanté [prénom] ! Tu fais quoi dans la vie ?" 
UNE SEULE PHRASE.`,
        
        2: `L'utilisateur t'a dit ce qu'il fait.
Réponds: "Cool ! Et c'est quoi ton plus gros défi en ce moment ? Le truc qui te prend la tête."
UNE SEULE PHRASE.`,
        
        3: `L'utilisateur t'a parlé de son défi.
Réponds: "Je vois. Si je pouvais faire UN truc pour toi là maintenant, ce serait quoi ?"
UNE SEULE PHRASE.`,
        
        4: `L'onboarding est fini.
Réponds: "Parfait, j'ai compris ce qu'il te faut ! Je suis prêt. Demande-moi ce que tu veux."
UNE SEULE PHRASE.`
    };
    
    return prompts[step] || prompts[4];
}

module.exports = {
    generateResponse,
    getDefaultSystemPrompt,
    getOnboardingPrompt
};
