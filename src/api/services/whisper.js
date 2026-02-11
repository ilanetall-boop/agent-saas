// OpenAI Whisper Service
// Transcription audio → texte

const { openai } = require('./claude'); // Réutiliser OpenAI client
const fs = require('fs');

async function transcribeWithWhisper(audioPath, context = {}) {
    try {
        const audioFile = fs.createReadStream(audioPath);
        
        const response = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: context.language || 'en'
        });
        
        return {
            text: response.text,
            model: 'whisper',
            duration: context.duration || 0,
            cost: (context.duration || 0) * 0.0001 // ~$0.0001 per minute
        };
    } catch (error) {
        console.error('Whisper API error:', error.message);
        throw error;
    }
}

module.exports = {
    transcribeWithWhisper
};
