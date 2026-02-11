// Google Gemini API Service
// Utiliser pour analyse longue, documents

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateWithGemini(prompt, context = {}) {
    if (!GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY pas configuré');
        return null;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: context.model || 'gemini-pro' 
        });
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        return {
            content: response.text(),
            model: 'gemini',
            tokens: response.usageMetadata?.totalTokenCount || 0,
            cost: (response.usageMetadata?.totalTokenCount || 0) * 0.000001 // ~$0.001 per 1M tokens
        };
    } catch (error) {
        console.error('Gemini API error:', error.message);
        throw error;
    }
}

module.exports = {
    generateWithGemini
};
