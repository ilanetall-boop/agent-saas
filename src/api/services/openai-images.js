// OpenAI DALL-E Image Generation
// Best quality images (plus cher que Stable Diffusion)

const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateImageWithDallE(prompt, context = {}) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY pas configuré');
        return null;
    }
    
    try {
        const response = await openai.images.generate({
            model: context.model || 'dall-e-3',
            prompt: prompt,
            n: context.count || 1,
            size: context.size || '1024x1024',
            quality: context.quality || 'standard',
            style: context.style || 'vivid'
        });
        
        return {
            images: response.data.map(img => img.url),
            model: 'dall-e-3',
            prompt: prompt,
            cost: 0.04 // $0.04 per image
        };
    } catch (error) {
        console.error('DALL-E API error:', error.message);
        throw error;
    }
}

module.exports = {
    generateImageWithDallE
};
