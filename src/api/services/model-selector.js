// Auto-sélecteur de modèle IA
// La magie: choisir le meilleur + cheapest model par tâche

const { generateWithClaude } = require('./claude');
const { generateWithMistral } = require('./mistral');
const { generateWithGemini } = require('./gemini');
const { transcribeWithWhisper } = require('./whisper');
const { synthesizeWithElevenLabs } = require('./elevenlabs');
const { generateImageWithDallE } = require('./openai-images');
const { generateImageWithStableDiffusion } = require('./stable-diffusion');

// Stratégie de sélection
const MODEL_STRATEGY = {
    // Écriture de texte simple → Opus (meilleur)
    'email': { model: 'claude-opus-4-5', provider: 'claude' },
    'summarize': { model: 'claude-opus-4-5', provider: 'claude' },
    'translate': { model: 'mistral', provider: 'mistral' }, // Mistral pour traduction rapide
    'simple_analysis': { model: 'claude-opus-4-5', provider: 'claude' },
    
    // Écriture de code (Opus excellent)
    'code_generation': { model: 'claude-opus-4-5', provider: 'claude' },
    'code_review': { model: 'claude-opus-4-5', provider: 'claude' },
    'refactor': { model: 'claude-opus-4-5', provider: 'claude' },
    
    // Analyse longue (documents, recherche)
    'long_analysis': { model: 'claude-opus-4-5', provider: 'claude' },
    'document_analysis': { model: 'claude-opus-4-5', provider: 'claude' },
    'research': { model: 'claude-opus-4-5', provider: 'claude' },
    
    // Génération d'images
    'image_generation': { model: 'dall-e-3', provider: 'openai' }, // Best quality
    'image_edit': { model: 'dall-e-3', provider: 'openai' },
    'fast_image': { model: 'stable-diffusion', provider: 'stability' }, // Faster, cheaper
    
    // Audio
    'transcribe': { model: 'whisper', provider: 'openai' }, // Only option
    'tts': { model: 'elevenlabs', provider: 'elevenlabs' }, // Most human-like
    
    // Default
    'default': { model: 'claude-opus-4-5', provider: 'claude' }
};

async function selectAndGenerate(taskType, prompt, context = {}) {
    try {
        // Sélectionner le modèle
        const strategy = MODEL_STRATEGY[taskType] || MODEL_STRATEGY['default'];
        console.log(`📊 Sélection: ${taskType} → ${strategy.provider}/${strategy.model}`);
        
        // Exécuter avec le modèle sélectionné
        switch (strategy.provider) {
            case 'claude':
                return await generateWithClaude(prompt, context, strategy.model);
            
            case 'mistral':
                return await generateWithMistral(prompt, context);
            
            case 'gemini':
                return await generateWithGemini(prompt, context);
            
            case 'openai':
                return await generateImageWithDallE(prompt, context);
            
            case 'stability':
                return await generateImageWithStableDiffusion(prompt, context);
            
            case 'elevenlabs':
                return await synthesizeWithElevenLabs(prompt, context);
            
            default:
                console.warn(`⚠️ Provider inconnu: ${strategy.provider}`);
                return await generateWithClaude(prompt, context, 'claude-opus-4-5');
        }
    } catch (error) {
        console.error(`❌ Erreur sélection modèle:`, error);
        throw error;
    }
}

// Info sur les coûts
const COST_INFO = {
    'claude-haiku': '$0.0008 per 1M input tokens',
    'claude-sonnet': '$0.003 per 1M input tokens',
    'claude-opus': '$0.015 per 1M input tokens',
    'mistral': '$0.0002 per 1M input tokens (très cheap)',
    'gemini': '$0.001 per 1M input tokens',
    'dall-e-3': '$0.04 per image',
    'stable-diffusion': '$0.0001 per image',
    'whisper': '$0.0001 per minute',
    'elevenlabs': '$0.002 per 1000 characters'
};

function printCostInfo() {
    console.log('\n💰 Coûts des modèles:');
    Object.entries(COST_INFO).forEach(([model, cost]) => {
        console.log(`  ${model}: ${cost}`);
    });
}

module.exports = {
    selectAndGenerate,
    MODEL_STRATEGY,
    COST_INFO,
    printCostInfo
};
