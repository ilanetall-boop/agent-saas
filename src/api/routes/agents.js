const express = require('express');
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');
const { generateResponse, getDefaultSystemPrompt } = require('../services/claude');

const router = express.Router();

// Get user's agent
router.get('/me', authMiddleware, (req, res) => {
    const agent = db.getAgentByUserId(req.user.id);
    
    if (!agent) {
        return res.status(404).json({ error: 'Agent non trouvé' });
    }
    
    const memories = db.getAllMemories(agent.id);
    const memoryMap = {};
    memories.forEach(m => { memoryMap[m.key] = m.value; });
    
    res.json({
        agent: {
            id: agent.id,
            name: agent.name,
            telegramConnected: !!agent.telegram_chat_id,
            onboardingComplete: !!agent.onboarding_complete
        },
        memory: memoryMap
    });
});

// Chat with agent
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }
        
        // Check message limit
        if (req.user.messages_used >= req.user.messages_limit) {
            return res.status(429).json({ 
                error: 'Limite de messages atteinte',
                limit: req.user.messages_limit,
                used: req.user.messages_used
            });
        }
        
        const agent = db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }
        
        // Get or create conversation
        let conversation = db.getActiveConversation(agent.id);
        if (!conversation) {
            const convId = nanoid();
            db.createConversation(convId, agent.id, 'web');
            conversation = { id: convId };
        }
        
        // Get conversation history
        const history = db.getRecentMessages(conversation.id, 20).reverse();
        
        // Get memory
        const memories = db.getAllMemories(agent.id);
        const memoryMap = {};
        memories.forEach(m => { memoryMap[m.key] = m.value; });
        
        // Add user message
        db.addMessage(nanoid(), conversation.id, 'user', message);
        
        // Generate response
        const systemPrompt = getDefaultSystemPrompt(agent.name, memoryMap.name || req.user.name);
        const response = await generateResponse({
            systemPrompt,
            messages: [...history, { role: 'user', content: message }],
            memory: memoryMap
        });
        
        if (!response.success) {
            return res.status(500).json({ error: 'Erreur lors de la génération de réponse' });
        }
        
        // Save assistant message
        db.addMessage(nanoid(), conversation.id, 'assistant', response.content);
        
        // Update message count
        db.updateUserMessages(req.user.id);
        
        res.json({
            response: response.content,
            usage: {
                messagesUsed: req.user.messages_used + 1,
                messagesLimit: req.user.messages_limit
            }
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Erreur lors du chat' });
    }
});

// Update agent memory
router.post('/memory', authMiddleware, (req, res) => {
    const { key, value } = req.body;
    
    if (!key) {
        return res.status(400).json({ error: 'Clé requise' });
    }
    
    const agent = db.getAgentByUserId(req.user.id);
    if (!agent) {
        return res.status(404).json({ error: 'Agent non trouvé' });
    }
    
    db.setMemory(nanoid(), agent.id, key, value);
    
    res.json({ success: true });
});

module.exports = router;
