const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const { getDefaultSystemPrompt } = require('./claude');
const { generateResponse } = require('./claude');
const { transcribeAudio, textToSpeech, downloadAudio } = require('./audio');
const db = require('../db/db');
const { nanoid } = require('nanoid');

// Store active bot instances per agent
const activeBots = new Map();

/**
 * Initialize Telegram bot for an agent
 * @param {Object} options
 * @param {string} options.agentId - Agent ID
 * @param {string} options.botToken - Telegram bot token
 * @param {string} options.webhookUrl - Webhook URL for updates (optional, uses polling if not provided)
 */
async function initBot({ agentId, botToken, webhookUrl = null }) {
    try {
        // Check if bot already exists
        if (activeBots.has(agentId)) {
            const existingBot = activeBots.get(agentId);
            try {
                existingBot.stopPolling();
            } catch (e) {
                // Bot might already be stopped
            }
        }

        // Create bot instance
        const options = webhookUrl 
            ? { webHook: { port: process.env.PORT || 3000 } }
            : { polling: true };

        const bot = new TelegramBot(botToken, options);

        // Handle incoming messages
        bot.on('message', async (msg) => {
            await handleMessage(msg, agentId, bot);
        });

        // Handle callback queries (button clicks)
        bot.on('callback_query', async (query) => {
            await handleCallbackQuery(query, agentId, bot);
        });

        // Handle errors
        bot.on('polling_error', (error) => {
            console.error(`Telegram polling error for agent ${agentId}:`, error);
        });

        // Store bot instance
        activeBots.set(agentId, bot);

        console.log(`✅ Telegram bot initialized for agent ${agentId}`);
        return { success: true, bot };
    } catch (error) {
        console.error('Failed to initialize Telegram bot:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle incoming Telegram message (text or voice)
 */
async function handleMessage(msg, agentId, bot) {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'Ami';
        
        // Store chatId if not already stored
        const agent = db.getAgentByUserId(agentId);
        if (agent && !agent.telegram_chat_id) {
            db.updateAgentTelegram(agent.id, agent.telegram_bot_token, chatId);
            console.log(`[TELEGRAM] Captured chatId ${chatId} for agent ${agentId}`);
        }

        // Handle commands
        if (msg.text && msg.text.startsWith('/')) {
            return handleCommand(msg, agentId, bot);
        }

        let userText = msg.text;
        let isVoiceMessage = false;

        // Handle voice messages
        if (msg.voice) {
            isVoiceMessage = true;
            await bot.sendChatAction(chatId, 'typing');
            
            console.log(`[VOICE] Transcribing voice message from user ${userId}`);
            
            try {
                // Get file URL from Telegram
                const fileUrl = await bot.getFileLink(msg.voice.file_id);
                
                // Download audio
                const audioBuffer = await downloadAudio(fileUrl);
                
                // Transcribe with Whisper
                const transcription = await transcribeAudio(audioBuffer, 'audio/ogg');
                
                if (!transcription.success) {
                    await bot.sendMessage(chatId, '❌ Impossible de transcrire le message vocal. Réessaye.');
                    return;
                }
                
                userText = transcription.text;
                console.log(`[VOICE] Transcribed: "${userText}"`);
            } catch (error) {
                console.error('[VOICE ERROR]', error.message);
                await bot.sendMessage(chatId, '❌ Erreur lors de la transcription. Réessaye.');
                return;
            }
        } else if (!userText) {
            // No text and no voice
            return;
        }

        // Get or create conversation
        let conversation = db.getActiveConversation(agentId);
        if (!conversation) {
            const convId = nanoid();
            db.createConversation(convId, agentId, 'telegram');
            conversation = { id: convId };
        }

        // Get conversation history (last 10 messages)
        const history = db.getRecentMessages(conversation.id, 10).reverse();

        // Get memory (agent already fetched above)
        const memories = db.getAllMemories(agentId);
        const memoryMap = {};
        memories.forEach(m => { memoryMap[m.key] = m.value; });

        // Store user message
        db.addMessage(nanoid(), conversation.id, 'user', userText);

        // Show typing indicator
        await bot.sendChatAction(chatId, 'typing');

        // Generate response
        const systemPrompt = getDefaultSystemPrompt(agent.name, memoryMap.name || userName);
        const response = await generateResponse({
            systemPrompt,
            messages: [...history, { role: 'user', content: userText }],
            memory: memoryMap
        });

        if (!response.success) {
            await bot.sendMessage(chatId, '❌ Erreur lors de la génération de réponse. Réessaye plus tard.');
            return;
        }

        // Store assistant message
        db.addMessage(nanoid(), conversation.id, 'assistant', response.content);

        // If user sent voice, respond with voice
        if (isVoiceMessage && config.openaiApiKey) {
            console.log(`[TTS] Generating voice response`);
            
            try {
                // Generate voice response
                const tts = await textToSpeech(response.content, 'nova');
                
                if (!tts.success) {
                    // Fallback to text
                    console.warn(`[TTS] Failed, sending as text: ${tts.error}`);
                    await bot.sendMessage(chatId, response.content);
                    return;
                }
                
                // Send voice message
                await bot.sendVoice(chatId, tts.buffer);
                console.log(`[TTS] Voice response sent`);
            } catch (error) {
                console.error('[TTS ERROR]', error.message);
                // Fallback to text
                await bot.sendMessage(chatId, response.content);
            }
        } else {
            // Send text response (split if too long)
            const maxLength = 4096;
            if (response.content.length > maxLength) {
                const chunks = response.content.match(new RegExp(`.{1,${maxLength}}`, 'g'));
                for (const chunk of chunks) {
                    await bot.sendMessage(chatId, chunk);
                }
            } else {
                await bot.sendMessage(chatId, response.content);
            }
        }
    } catch (error) {
        console.error('Error handling Telegram message:', error);
        try {
            await bot.sendMessage(msg.chat.id, '❌ Une erreur est survenue. Réessaye.');
        } catch (e) {
            console.error('Failed to send error message:', e);
        }
    }
}

/**
 * Handle Telegram commands
 */
async function handleCommand(msg, agentId, bot) {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0].toLowerCase();

    switch (command) {
        case '/start':
            await bot.sendMessage(chatId, `
👋 Bienvenue! Je suis ton agent IA personnel.

Je peux t'aider à:
- Répondre à tes questions
- T'aider à réfléchir
- Automatiser des tâches
- Écrire du contenu
- Et bien plus!

Écris simplement un message pour commencer. 💬
            `.trim());
            break;

        case '/help':
            await bot.sendMessage(chatId, `
📋 Commandes disponibles:

/start - Démarrer
/help - Afficher l'aide
/memory - Voir ce que je sais sur toi
/reset - Réinitialiser la conversation

Ou écris simplement un message!
            `.trim());
            break;

        case '/memory':
            const agent = db.getAgentByUserId(agentId);
            const memories = db.getAllMemories(agentId);
            
            if (memories.length === 0) {
                await bot.sendMessage(chatId, '📝 Je ne sais rien sur toi encore. Dis-moi des choses! 😊');
                return;
            }

            let memoryText = '📝 Ce que je sais sur toi:\n\n';
            memories.forEach(m => {
                memoryText += `• ${m.key}: ${m.value}\n`;
            });

            await bot.sendMessage(chatId, memoryText);
            break;

        case '/reset':
            // Create new conversation
            const newConvId = nanoid();
            db.createConversation(newConvId, agentId, 'telegram');
            await bot.sendMessage(chatId, '🔄 Conversation réinitialisée. On recommence! 🚀');
            break;

        default:
            await bot.sendMessage(chatId, '❓ Commande inconnue. Tape /help pour l\'aide.');
    }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(query, agentId, bot) {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Acknowledge the callback query
    await bot.answerCallbackQuery(query.id);

    // Handle different callback types
    if (data === 'link_agent') {
        // User wants to link their agent
        await bot.sendMessage(chatId, '🔗 Pour lier ton agent, va sur app.agent-saas.com et connecte-toi avec ton compte.');
    }
}

/**
 * Link a Telegram chat to an existing agent
 * @param {string} agentId - Agent ID
 * @param {string} botToken - Telegram bot token
 * @param {number} chatId - Telegram chat ID
 * @param {string} webhookUrl - Optional webhook URL
 */
async function linkTelegramChat(agentId, botToken, chatId, webhookUrl = null) {
    try {
        // Update agent with Telegram info
        db.updateAgentTelegram(agentId, botToken, chatId);

        // Initialize bot if not already done
        if (!activeBots.has(agentId)) {
            const result = await initBot({ agentId, botToken, webhookUrl });
            if (!result.success) {
                throw new Error(result.error);
            }
        }

        // Send welcome message
        const bot = activeBots.get(agentId);
        const agent = db.getAgentByUserId(agentId);
        
        await bot.sendMessage(chatId, `
✨ Bienvenue sur Telegram, ${agent.name}!

Je suis prêt à t'aider. Posez-moi une question ou dites-moi ce que vous voulez faire.
        `.trim());

        return { success: true, message: 'Telegram lié avec succès' };
    } catch (error) {
        console.error('Failed to link Telegram chat:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a message to a Telegram chat
 * @param {string} agentId - Agent ID
 * @param {string} message - Message to send
 */
async function sendTelegramMessage(agentId, message) {
    try {
        const agent = db.getAgentByUserId(agentId);
        
        if (!agent || !agent.telegram_chat_id) {
            return { success: false, error: 'Telegram non lié' };
        }

        const bot = activeBots.get(agentId) || new TelegramBot(agent.telegram_bot_token);
        
        await bot.sendMessage(agent.telegram_chat_id, message);
        
        return { success: true };
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get bot instance for an agent
 */
function getBot(agentId) {
    return activeBots.get(agentId);
}

/**
 * Stop bot for an agent
 */
async function stopBot(agentId) {
    try {
        const bot = activeBots.get(agentId);
        if (bot) {
            await bot.stopPolling();
            activeBots.delete(agentId);
            console.log(`✅ Telegram bot stopped for agent ${agentId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to stop Telegram bot:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process webhook from Telegram
 */
async function processWebhook(body, agentId) {
    try {
        if (!body.message) {
            return { success: true }; // Not a message, ignore
        }

        const bot = getBot(agentId);
        if (!bot) {
            return { success: false, error: 'Bot not initialized' };
        }

        await handleMessage(body.message, agentId, bot);
        return { success: true };
    } catch (error) {
        console.error('Webhook processing error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initBot,
    linkTelegramChat,
    sendTelegramMessage,
    getBot,
    stopBot,
    processWebhook,
    handleMessage,
    handleCommand
};
