const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { 
    initBot, 
    linkTelegramChat, 
    sendTelegramMessage, 
    getBot,
    stopBot,
    processWebhook
} = require('../services/telegram');
const db = require('../db/db');

const router = express.Router();

/**
 * POST /api/telegram/webhook/:agentId
 * Webhook for receiving Telegram updates
 * Used if webhook mode is enabled instead of polling
 */
router.post('/webhook/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const body = req.body;

        // Verify agentId exists
        // Note: In production, you should verify this is a valid agent
        // and perhaps verify the Telegram bot token matches

        const result = await processWebhook(body, agentId);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * POST /api/telegram/init
 * Initialize Telegram bot (no chatId required)
 * Bot starts polling, chatId captured from first user message
 * Body: { botToken }
 */
router.post('/init', authMiddleware, async (req, res) => {
    try {
        const { botToken } = req.body;

        if (!botToken) {
            return res.status(400).json({ error: 'botToken requis' });
        }

        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Initialize bot (polling mode)
        const result = await initBot({ agentId: req.user.id, botToken });

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        await db.updateAgentTelegram(agent.id, botToken, null);

        res.json({
            success: true,
            message: '✅ Bot démarré! Envoie un message à ton bot sur Telegram.',
            agent: { id: agent.id, name: agent.name, telegramConnected: true }
        });
    } catch (error) {
        console.error('Init Telegram error:', error);
        res.status(500).json({ error: 'Erreur lors du démarrage du bot Telegram' });
    }
});

/**
 * POST /api/telegram/link
 * Link user's agent to Telegram
 * Body: { botToken, chatId, webhookUrl? }
 */
router.post('/link', authMiddleware, async (req, res) => {
    try {
        const { botToken, chatId, webhookUrl } = req.body;

        // Validate required fields
        if (!botToken || !chatId) {
            return res.status(400).json({ 
                error: 'botToken et chatId sont requis' 
            });
        }

        // Get user's agent
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Link Telegram to agent
        const result = await linkTelegramChat(
            req.user.id, 
            botToken, 
            chatId, 
            webhookUrl
        );

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            message: result.message,
            agent: {
                id: agent.id,
                name: agent.name,
                telegramConnected: true
            }
        });
    } catch (error) {
        console.error('Link Telegram error:', error);
        res.status(500).json({ error: 'Erreur lors de la liaison Telegram' });
    }
});

/**
 * GET /api/telegram/status
 * Get Telegram connection status for user's agent
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const isConnected = !!agent.telegram_chat_id;
        const bot = getBot(req.user.id);
        const isRunning = !!bot;

        res.json({
            connected: isConnected,
            isRunning,
            chatId: isConnected ? agent.telegram_chat_id : null,
            agentName: agent.name
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification du statut' });
    }
});

/**
 * POST /api/telegram/send
 * Send a message via Telegram to user's chat
 * Body: { message }
 */
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Get user's agent
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Send message
        const result = await sendTelegramMessage(req.user.id, message);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({ success: true, message: 'Message envoyé' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
});

/**
 * POST /api/telegram/disconnect
 * Disconnect/stop Telegram bot
 */
router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Stop bot
        const result = await stopBot(req.user.id);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Update agent (clear Telegram info)
        await db.updateAgentTelegram(agent.id, null, null);

        res.json({
            success: true,
            message: 'Bot Telegram arrêté et déconnecté'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

/**
 * GET /api/telegram/info
 * Get Telegram connection info
 */
router.get('/info', authMiddleware, async (req, res) => {
    try {
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        res.json({
            connected: !!agent.telegram_chat_id,
            chatId: agent.telegram_chat_id,
            botTokenSet: !!agent.telegram_bot_token,
            agentName: agent.name,
            agentId: agent.id
        });
    } catch (error) {
        console.error('Info error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des infos' });
    }
});

module.exports = router;
