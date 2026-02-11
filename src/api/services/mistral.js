// Mistral API Service
// Utiliser pour traductions cheap, texte simple

const axios = require('axios');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

async function generateWithMistral(prompt, context = {}) {
    if (!MISTRAL_API_KEY) {
        console.warn('⚠️ MISTRAL_API_KEY pas configuré');
        return null;
    }
    
    try {
        const response = await axios.post(MISTRAL_API_URL, {
            model: context.model || 'mistral-medium',
            messages: [
                { role: 'system', content: context.systemPrompt || 'Tu es un assistant utile.' },
                { role: 'user', content: prompt }
            ],
            temperature: context.temperature || 0.7,
            max_tokens: context.maxTokens || 2000
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return {
            content: response.data.choices[0].message.content,
            model: 'mistral',
            tokens: response.data.usage.total_tokens,
            cost: response.data.usage.total_tokens * 0.0000002 // ~$0.0002 per 1M tokens
        };
    } catch (error) {
        console.error('Mistral API error:', error.message);
        throw error;
    }
}

module.exports = {
    generateWithMistral
};
