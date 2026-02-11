const express = require('express');
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');
const { generateResponse, getDefaultSystemPrompt, getOnboardingPrompt } = require('../services/claude');
const ErrorRecovery = require('../services/error-recovery');

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
            name: agent.name || 'Alex',
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
        
        // Refresh user data to get latest message count
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Check message limit (strict: each chat counts as 1 message)
        if (freshUser.messages_used >= freshUser.messages_limit) {
            return res.status(429).json({ 
                error: 'Limite de messages atteinte',
                limit: freshUser.messages_limit,
                used: freshUser.messages_used,
                remaining: 0
            });
        }
        
        // Update reference
        req.user = freshUser;
        
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
        const history = db.getRecentMessages(conversation.id, 10).reverse();
        
        // Get memory
        const memories = db.getAllMemories(agent.id);
        const memoryMap = {};
        memories.forEach(m => { memoryMap[m.key] = m.value; });
        
        // Add user message
        db.addMessage(nanoid(), conversation.id, 'user', message);
        
        // Determine if onboarding or normal chat
        let systemPrompt;
        const onboardingStep = parseInt(memoryMap.onboarding_step || '0');
        
        if (!agent.onboarding_complete && onboardingStep < 5) {
            // Extract info from user message based on CURRENT step
            // Then use NEXT step's prompt for response
            if (onboardingStep === 0) {
                // They gave their name
                const name = message.trim().split(' ')[0].replace(/[^a-zA-ZÀ-ÿ]/g, '');
                if (name) {
                    db.setMemory(nanoid(), agent.id, 'name', name);
                    memoryMap.name = name; // Update local copy
                }
            } else if (onboardingStep === 1) {
                db.setMemory(nanoid(), agent.id, 'job', message.substring(0, 200));
            } else if (onboardingStep === 2) {
                db.setMemory(nanoid(), agent.id, 'challenge', message.substring(0, 200));
            } else if (onboardingStep === 3) {
                db.setMemory(nanoid(), agent.id, 'first_need', message.substring(0, 200));
            }
            
            // Increment onboarding step BEFORE generating response
            const nextStep = onboardingStep + 1;
            db.setMemory(nanoid(), agent.id, 'onboarding_step', String(nextStep));
            
            // Use the NEXT step's prompt for the response
            systemPrompt = getOnboardingPrompt(nextStep, memoryMap);
            
            // Mark complete after step 4
            if (nextStep >= 5) {
                db.updateAgentOnboarding(agent.id);
            }
        } else {
            // Normal chat
            systemPrompt = getDefaultSystemPrompt('Alex', memoryMap.name || req.user.name);
        }
        
        // Generate response with smart error recovery
        let response;
        let errorRecovery = null;
        let recoveryAttempt = 1;
        
        async function attemptGenerate() {
            return generateResponse({
                systemPrompt,
                messages: [...history, { role: 'user', content: message }],
                memory: memoryMap
            });
        }
        
        try {
            response = await attemptGenerate();
        } catch (genError) {
            errorRecovery = new ErrorRecovery(agent);
            const recovery = await errorRecovery.recover(genError, {
                task: 'Génération de réponse',
                attempt: recoveryAttempt,
                onRetry: attemptGenerate
            });
            
            if (recovery.recovered) {
                response = recovery.result;
                console.log(`[Recovery] Success with strategy: ${recovery.strategy}`);
            } else {
                // Recovery failed, return error to user
                return res.status(500).json({ 
                    error: recovery.userNotification || 'Erreur lors du chat',
                    recoveryStatus: recovery.strategy
                });
            }
        }
        
        if (!response.success) {
            return res.status(500).json({ error: 'Erreur lors de la génération de réponse' });
        }
        
        // Save assistant message
        db.addMessage(nanoid(), conversation.id, 'assistant', response.content);
        
        // Update message count
        db.updateUserMessages(req.user.id);
        
        // Fetch updated user data for accurate usage
        const updatedUser = db.getUserById(req.user.id);
        
        res.json({
            response: response.content,
            usage: {
                messagesUsed: updatedUser.messages_used,
                messagesLimit: updatedUser.messages_limit,
                remaining: Math.max(0, updatedUser.messages_limit - updatedUser.messages_used)
            }
        });
    } catch (error) {
        console.error(`[CHAT ERROR] User: ${req.user?.id}, Message: "${req.body?.message?.substring(0, 50)}", Error:`, error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erreur lors du chat',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
