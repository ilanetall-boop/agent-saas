const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey
});

/**
 * Generate a response from Claude
 * @param {Object} options
 * @param {string} options.systemPrompt - System instructions
 * @param {Array} options.messages - Conversation history [{role, content}]
 * @param {Object} options.memory - Agent's memory about user
 * @param {string} options.model - Model to use
 */
async function generateResponse({ systemPrompt, messages, memory = {}, model = config.defaultModel }) {
    // Build context from memory
    let memoryContext = '';
    if (Object.keys(memory).length > 0) {
        memoryContext = '\n\nCe que tu sais sur l\'utilisateur:\n';
        for (const [key, value] of Object.entries(memory)) {
            memoryContext += `- ${key}: ${value}\n`;
        }
    }

    const fullSystemPrompt = systemPrompt + memoryContext;

    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens: 1024,
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
 * Default system prompt for agents
 */
function getDefaultSystemPrompt(agentName, userName) {
    return `Tu es ${agentName || 'un assistant IA personnel'}. Tu appartiens à ${userName || 'ton utilisateur'}.

Tu es là pour l'aider dans tout ce qu'il veut :
- Répondre à ses questions
- L'aider à réfléchir
- Automatiser des tâches
- Écrire du contenu
- Et bien plus

Ton style :
- Direct et efficace
- Pas de blabla inutile
- Tu proposes des solutions concrètes
- Tu demandes des précisions si nécessaire
- Tu utilises le français naturellement

Si on te demande quelque chose que tu ne peux pas faire maintenant, dis-le honnêtement et propose une alternative.`;
}

/**
 * Onboarding conversation prompts
 */
const onboardingQuestions = [
    "Salut ! Je suis ton nouvel assistant. Comment tu t'appelles ?",
    "Enchanté {name} ! Tu fais quoi dans la vie ? (Job, études, passion...)",
    "Cool ! Et c'est quoi ton plus gros défi en ce moment ? Ce qui te prend du temps ou t'énerve ?",
    "Je vois. Et si je pouvais faire UNE chose pour toi là maintenant, ce serait quoi ?",
    "Parfait, j'ai compris ce dont tu as besoin. On va bien s'entendre ! Tu peux me demander ce que tu veux, je suis là pour toi."
];

function getOnboardingPrompt(step, previousAnswers = {}) {
    let prompt = onboardingQuestions[step] || onboardingQuestions[0];
    
    // Replace placeholders
    if (previousAnswers.name) {
        prompt = prompt.replace('{name}', previousAnswers.name);
    }
    
    return prompt;
}

module.exports = {
    generateResponse,
    getDefaultSystemPrompt,
    getOnboardingPrompt,
    onboardingQuestions
};
