const express = require('express');
const axios = require('axios');
const router = express.Router();

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * POST /api/telegram/webhook
 * Simple welcome and message handler
 */
router.post('/webhook', async (req, res) => {
    try {
        const { message, callback_query } = req.body;

        // Handle text messages
        if (message) {
            const { chat, text, from, photo, document, voice } = message;
            const userId = from.id;
            const userName = from.first_name || 'User';
            const chatId = chat.id;

            // Handle /start command
            if (text?.startsWith('/start')) {
                await sendWelcomeMessage(chatId, userName);
            }
            // Handle text input
            else if (text) {
                await processTextRequest(chatId, userId, text);
            }
            // Handle image input
            else if (photo) {
                await processImageRequest(chatId, userId, photo);
            }
            // Handle document input
            else if (document) {
                await processDocumentRequest(chatId, userId, document);
            }
            // Handle voice input
            else if (voice) {
                await processVoiceRequest(chatId, userId, voice);
            }
            else {
                await sendMessage(chatId, '👋 Hi! I can help with text, images, files, or voice. Just send me what you need!');
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.sendStatus(500);
    }
});

/**
 * Send simple welcome message
 */
async function sendWelcomeMessage(chatId, userName) {
    const text = `👋 Hey ${userName}! I'm My Best Agent.\n\n✨ What do you want to create today? Just ask!\n\nI can help with:\n💻 Websites & apps\n🖼️ Images & graphics\n📝 Content & writing\n🤖 Automation\n💾 Data & files\n\nJust send me anything—text, images, or files—and I'll help!`;

    await sendMessage(chatId, text);
}

/**
 * Process text requests
 */
async function processTextRequest(chatId, userId, text) {
    try {
        // Show typing indicator
        await sendChatAction(chatId, 'typing');

        // Call Claude API to process the request
        const response = await callClaudeAPI(text);

        // Send response back to user
        await sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing text:', error);
        await sendMessage(chatId, '❌ Something went wrong. Please try again.');
    }
}

/**
 * Process image requests
 */
async function processImageRequest(chatId, userId, photo) {
    try {
        // Show uploading indicator
        await sendChatAction(chatId, 'upload_photo');

        // Get the file info
        const fileId = photo[photo.length - 1].file_id;
        
        // Process with Claude vision
        const response = await processImageWithVision(fileId);

        // Send response
        await sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing image:', error);
        await sendMessage(chatId, '❌ Could not process the image. Try again.');
    }
}

/**
 * Process document requests
 */
async function processDocumentRequest(chatId, userId, document) {
    try {
        await sendChatAction(chatId, 'upload_document');

        const fileId = document.file_id;
        const fileName = document.file_name;

        // Process document with Claude
        const response = await processDocumentWithClaude(fileId, fileName);

        // Send response
        await sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing document:', error);
        await sendMessage(chatId, '❌ Could not process the file. Try again.');
    }
}

/**
 * Process voice requests
 */
async function processVoiceRequest(chatId, userId, voice) {
    try {
        await sendChatAction(chatId, 'typing');

        const fileId = voice.file_id;

        // Convert voice to text and process
        const response = await processVoiceWithClaude(fileId);

        // Send response
        await sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing voice:', error);
        await sendMessage(chatId, '❌ Could not process the voice message. Try again.');
    }
}

/**
 * Send a simple text message
 */
async function sendMessage(chatId, text) {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

/**
 * Send chat action (typing, uploading, etc.)
 */
async function sendChatAction(chatId, action) {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendChatAction`, {
            chat_id: chatId,
            action: action
        });
    } catch (error) {
        console.error('Error sending chat action:', error);
    }
}

/**
 * Call Claude API to process text
 */
async function callClaudeAPI(prompt) {
    try {
        // This would be your actual Claude API call
        // For now, return a simple response
        return `✅ Got your request: "${prompt}"\n\nI'm ready to help! (In a real app, this would call Claude AI)`;
    } catch (error) {
        console.error('Error calling Claude:', error);
        throw error;
    }
}

/**
 * Process image with Claude Vision
 */
async function processImageWithVision(fileId) {
    try {
        // This would call Claude with vision capabilities
        return '🖼️ Image received and analyzed! (Vision processing would happen here)';
    } catch (error) {
        console.error('Error processing image with vision:', error);
        throw error;
    }
}

/**
 * Process document with Claude
 */
async function processDocumentWithClaude(fileId, fileName) {
    try {
        // This would process the document content with Claude
        return `📄 Document "${fileName}" received and analyzed!`;
    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
}

/**
 * Process voice with Claude
 */
async function processVoiceWithClaude(fileId) {
    try {
        // This would transcribe and process the voice message
        return '🎙️ Voice message received and processed!';
    } catch (error) {
        console.error('Error processing voice:', error);
        throw error;
    }
}

/**
 * GET /api/telegram/set-webhook
 * Set up the webhook (call this once to initialize)
 */
router.get('/set-webhook', async (req, res) => {
    try {
        const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
        
        if (!webhookUrl) {
            return res.status(400).json({ error: 'TELEGRAM_WEBHOOK_URL not set' });
        }

        const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query']
        });

        res.json({
            success: true,
            message: 'Webhook set successfully',
            response: response.data
        });
    } catch (error) {
        console.error('Error setting webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/telegram/info
 * Get bot info and webhook status
 */
router.get('/info', async (req, res) => {
    try {
        const botInfo = await axios.get(`${TELEGRAM_API_URL}/getMe`);
        const webhookInfo = await axios.get(`${TELEGRAM_API_URL}/getWebhookInfo`);

        res.json({
            bot: botInfo.data.result,
            webhook: webhookInfo.data.result
        });
    } catch (error) {
        console.error('Error getting info:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
