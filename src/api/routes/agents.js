const express = require('express');
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');
const { generateResponse, getDefaultSystemPrompt, getOnboardingPrompt } = require('../services/claude');
const ErrorRecovery = require('../services/error-recovery');
const { validateRequest, schemas, sanitizeMessage } = require('../middleware/validation');
const { log: auditLog } = require('../services/audit-log');

const router = express.Router();

// Get user's agent
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const agent = await db.getAgentByUserId(req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }
        
        const memories = await db.getAllMemories(agent.id);
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
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'agent' });
    }
});

// Chat with agent
router.post('/chat', authMiddleware, validateRequest(schemas.chat), async (req, res) => {
    try {
        let { message, language } = req.validatedBody;
        
        console.log(`\n💬 [CHAT] User: ${req.user.email}, Language: ${language || 'default'}`);
        console.log(`   Message: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`);
        
        // Sanitize message to prevent XSS
        message = sanitizeMessage(message);
        
        // Refresh user data to get latest message count
        const freshUser = await db.getUserById(req.user.id);
        if (!freshUser) {
            console.error('❌ User not found');
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
        
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }
        
        // Get or create conversation
        let conversation = await db.getActiveConversation(agent.id);
        if (!conversation) {
            const convId = nanoid();
            await db.createConversation(convId, agent.id, 'web');
            conversation = { id: convId };
        }
        
        // Get conversation history
        const historyRaw = await db.getRecentMessages(conversation.id, 10);
        const history = historyRaw.reverse();
        
        // Get memory
        const memories = await db.getAllMemories(agent.id);
        const memoryMap = {};
        memories.forEach(m => { memoryMap[m.key] = m.value; });
        
        // Add user message
        await db.addMessage(nanoid(), conversation.id, 'user', message);
        
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
                    await db.setMemory(nanoid(), agent.id, 'name', name);
                    memoryMap.name = name; // Update local copy
                }
            } else if (onboardingStep === 1) {
                await db.setMemory(nanoid(), agent.id, 'job', message.substring(0, 200));
            } else if (onboardingStep === 2) {
                await db.setMemory(nanoid(), agent.id, 'challenge', message.substring(0, 200));
            } else if (onboardingStep === 3) {
                await db.setMemory(nanoid(), agent.id, 'first_need', message.substring(0, 200));
            }
            
            // Increment onboarding step BEFORE generating response
            const nextStep = onboardingStep + 1;
            await db.setMemory(nanoid(), agent.id, 'onboarding_step', String(nextStep));
            
            // Use the NEXT step's prompt for the response
            systemPrompt = getOnboardingPrompt(nextStep, memoryMap);
            
            // Mark complete after step 4
            if (nextStep >= 5) {
                await db.updateAgentOnboarding(agent.id);
            }
        } else {
            // Normal chat - adapt system prompt to user's language
            systemPrompt = getDefaultSystemPrompt('Alex', memoryMap.name || req.user.name, language);
        }
        
        // Determine user tier for AI routing
        const userTier = req.user.tier || 'free';
        
        // Generate response with smart error recovery and AI routing
        let response;
        let errorRecovery = null;
        let recoveryAttempt = 1;
        
        async function attemptGenerate() {
            return generateResponse({
                systemPrompt,
                messages: [...history, { role: 'user', content: message }],
                memory: memoryMap,
                userTier, // Pass tier for smart model selection
                useRouter: true // Enable AI router
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
        await db.addMessage(nanoid(), conversation.id, 'assistant', response.content);
        
        // Update message count
        await db.updateUserMessages(req.user.id);
        
        // Fetch updated user data for accurate usage
        const updatedUser = await db.getUserById(req.user.id);
        
        // Log successful chat
        auditLog({
            type: 'chat_message',
            userId: req.user.id,
            agentId: agent.id,
            messageLength: message.length,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Phase 1: Soft degradation after 100 messages/day
        // If user exceeded threshold, add artificial delay to encourage upgrade to premium
        const config = require('../config');
        const messagesUsedToday = updatedUser.messages_used % 1000; // Rough estimation (see note below)
        let responseDelay = 0;
        
        if (messagesUsedToday > config.softDegradationThreshold) {
            responseDelay = config.degradedResponseDelay;
            console.log(`[SOFT DEGRADATION] User ${req.user.id}: ${messagesUsedToday} messages today, adding ${responseDelay}ms delay`);
            
            // Note: In production, you'd track messages-per-day in DB
            // For MVP, we use messages_used as proxy (increments each chat)
            // This is a soft nudge, not a hard block
        }
        
        // Apply delay if needed (non-blocking)
        if (responseDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, responseDelay));
        }
        
        console.log(`✅ [CHAT RESPONSE] Model: ${response.model || 'haiku'}, Tier: ${userTier}`);
        console.log(`   Response: "${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}"`);
        console.log(`   Usage: ${updatedUser.messages_used}/${updatedUser.messages_limit} messages\n`);
        
        res.json({
            response: response.content,
            usage: {
                messagesUsed: updatedUser.messages_used,
                messagesLimit: updatedUser.messages_limit,
                remaining: Math.max(0, updatedUser.messages_limit - updatedUser.messages_used),
                degraded: messagesUsedToday > config.softDegradationThreshold // Inform frontend
            },
            // AI routing info (for transparency)
            ai: {
                model: response.model || 'claude-3-5-haiku-20241022',
                provider: response.provider || 'anthropic',
                complexity: response.routing?.complexity || 'unknown',
                tier: userTier
            }
        });
    } catch (error) {
        console.error(`\n❌ [CHAT ERROR] User: ${req.user?.email}, Error: ${error.message}`);
        console.error('Stack:', error.stack.substring(0, 200));
        
        // Log chat error
        auditLog({
            type: 'chat_error',
            userId: req.user?.id,
            error: error.message.substring(0, 200),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.status(500).json({ 
            error: 'Erreur lors du chat',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update agent memory
router.post('/memory', authMiddleware, validateRequest(schemas.memory), async (req, res) => {
    try {
        const { key, value } = req.validatedBody;
        
        const agent = await db.getAgentByUserId(req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }
        
        await db.setMemory(nanoid(), agent.id, key, value);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update memory error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la mémoire' });
    }
});

module.exports = router;
