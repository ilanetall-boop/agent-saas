// Stable Diffusion API Service
// Génération images (alternative à DALL-E, moins cher + plus rapide)

const axios = require('axios');

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_URL = 'https://api.stability.ai/v1/generate';

async function generateImageWithStableDiffusion(prompt, context = {}) {
    if (!STABILITY_API_KEY) {
        console.warn('⚠️ STABILITY_API_KEY pas configuré');
        return null;
    }
    
    try {
        const response = await axios.post(STABILITY_API_URL, {
            prompt: prompt,
            negative_prompt: context.negativePrompt || '',
            height: context.height || 512,
            width: context.width || 512,
            steps: context.steps || 30,
            cfg_scale: context.cfgScale || 7.5,
            sampler: context.sampler || 'k_dpmpp_2m'
        }, {
            headers: {
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Convert base64 to URL or buffer
        const image = response.data.artifacts[0].base64;
        
        return {
            image: Buffer.from(image, 'base64'),
            model: 'stable-diffusion',
            prompt: prompt,
            cost: 0.00001 * (context.steps || 30) // Cost per step
        };
    } catch (error) {
        console.error('Stable Diffusion API error:', error.message);
        throw error;
    }
}

module.exports = {
    generateImageWithStableDiffusion
};
