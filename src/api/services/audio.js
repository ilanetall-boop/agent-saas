const OpenAI = require('openai');
const axios = require('axios');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/**
 * Transcribe audio file to text using OpenAI Whisper
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} mimeType - Audio MIME type (audio/ogg, audio/mp3, etc.)
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
    try {
        // Convert mimeType to file extension
        const ext = mimeType.split('/')[1] || 'ogg';
        
        // Create FormData-like object for OpenAI API
        const transcription = await openai.audio.transcriptions.create({
            file: new File([audioBuffer], `audio.${ext}`, { type: mimeType }),
            model: 'whisper-1',
            language: 'fr', // French
        });

        return {
            success: true,
            text: transcription.text
        };
    } catch (error) {
        console.error('[WHISPER ERROR]', error.message);
        return {
            success: false,
            error: `Transcription failed: ${error.message}`
        };
    }
}

/**
 * Generate speech from text using OpenAI TTS
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice model: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
 * @returns {Promise<{success: boolean, buffer?: Buffer, error?: string}>}
 */
async function textToSpeech(text, voice = 'nova') {
    try {
        if (!text || text.trim().length === 0) {
            return {
                success: false,
                error: 'Text cannot be empty'
            };
        }

        const response = await openai.audio.speech.create({
            model: 'tts-1-hd', // High quality
            voice: voice, // nova, alloy, echo, fable, onyx, shimmer
            input: text,
            response_format: 'opus', // Telegram uses Opus audio
        });

        // Response is a ReadableStream, convert to buffer
        const buffer = await response.arrayBuffer();
        
        return {
            success: true,
            buffer: Buffer.from(buffer)
        };
    } catch (error) {
        console.error('[TTS ERROR]', error.message);
        return {
            success: false,
            error: `Text-to-speech failed: ${error.message}`
        };
    }
}

/**
 * Download audio from URL (for Telegram voice messages)
 * @param {string} url - URL to download
 * @returns {Promise<Buffer>}
 */
async function downloadAudio(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('[DOWNLOAD ERROR]', error.message);
        throw error;
    }
}

module.exports = {
    transcribeAudio,
    textToSpeech,
    downloadAudio
};
