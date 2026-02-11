// ElevenLabs Text-to-Speech Service
// Texte → audio (voix humaine)

const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

async function synthesizeWithElevenLabs(text, context = {}) {
    if (!ELEVENLABS_API_KEY) {
        console.warn('⚠️ ELEVENLABS_API_KEY pas configuré');
        return null;
    }
    
    try {
        const voiceId = context.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice
        
        const response = await axios.post(
            `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
            {
                text: text,
                model_id: context.model || 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );
        
        return {
            audio: response.data, // Buffer audio
            model: 'elevenlabs',
            characterCount: text.length,
            cost: text.length * 0.000002 // ~$0.002 per 1000 characters
        };
    } catch (error) {
        console.error('ElevenLabs API error:', error.message);
        throw error;
    }
}

module.exports = {
    synthesizeWithElevenLabs
};
