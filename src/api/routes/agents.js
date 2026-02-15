const express = require('express');
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');
const { generateResponse, getDefaultSystemPrompt, getOnboardingPrompt } = require('../services/claude');
const ErrorRecovery = require('../services/error-recovery');
const { validateRequest, schemas, sanitizeMessage } = require('../middleware/validation');
const { log: auditLog } = require('../services/audit-log');

// New smart routing system
const { route: smartRoute } = require('../services/smart-router');
const { recordFeedback } = require('../services/knowledge-capitalizer');
const { getStats: getCostStats } = require('../services/cost-tracker');

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
                name: agent.name || 'Eva',
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
            // Smart extraction that understands natural language
            if (onboardingStep === 0) {
                // Extract name from various patterns
                let name = null;
                const msg = message.toLowerCase();

                // Pattern: "Je m'appelle [NAME]" or "je suis [NAME]" or "moi c'est [NAME]"
                const patterns = [
                    /je m'appelle\s+(\w+)/i,
                    /je suis\s+(\w+)/i,
                    /moi c'est\s+(\w+)/i,
                    /c'est\s+(\w+)/i,
                    /my name is\s+(\w+)/i,
                    /i'm\s+(\w+)/i,
                    /i am\s+(\w+)/i
                ];

                for (const pattern of patterns) {
                    const match = message.match(pattern);
                    if (match && match[1]) {
                        name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                        break;
                    }
                }

                // If no pattern matched, check if it's just a name (single word or two words)
                if (!name) {
                    const words = message.trim().split(/\s+/);
                    // Filter out common words that are NOT names
                    const notNames = ['je', 'suis', 'moi', 'c\'est', 'bonjour', 'salut', 'hello', 'hi', 'hey', 'oui', 'non'];
                    const firstWord = words[0].toLowerCase().replace(/[^a-zA-ZÀ-ÿ]/g, '');

                    if (!notNames.includes(firstWord) && firstWord.length >= 2) {
                        name = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
                    }
                }

                if (name) {
                    await db.setMemory(nanoid(), agent.id, 'name', name);
                    memoryMap.name = name;
                    console.log(`[Onboarding] Extracted name: ${name}`);
                }

                // Also check if user already mentioned their job
                const jobKeywords = ['photographe', 'développeur', 'designer', 'coach', 'prof', 'étudiant',
                    'artisan', 'freelance', 'entrepreneur', 'consultant', 'formateur', 'auteur',
                    'musicien', 'vidéaste', 'restaurateur', 'plombier', 'agent'];
                const hasJob = jobKeywords.some(kw => msg.includes(kw));
                if (hasJob) {
                    await db.setMemory(nanoid(), agent.id, 'job', message.substring(0, 200));
                    memoryMap.job = message.substring(0, 200);
                    console.log(`[Onboarding] Also extracted job from intro`);
                }

            } else if (onboardingStep === 1) {
                await db.setMemory(nanoid(), agent.id, 'job', message.substring(0, 200));
                memoryMap.job = message.substring(0, 200);
            } else if (onboardingStep === 2) {
                await db.setMemory(nanoid(), agent.id, 'challenge', message.substring(0, 200));
                memoryMap.challenge = message.substring(0, 200);
            } else if (onboardingStep === 3) {
                await db.setMemory(nanoid(), agent.id, 'first_need', message.substring(0, 200));
                memoryMap.first_need = message.substring(0, 200);
            }
            
            // Smart step progression - skip steps if info already known
            let nextStep = onboardingStep + 1;

            // If user already gave job in step 0 intro, skip step 1 (job question)
            if (onboardingStep === 0 && memoryMap.job) {
                nextStep = 2; // Skip to challenge question
                console.log(`[Onboarding] User already gave job, skipping to step 2`);
            }

            await db.setMemory(nanoid(), agent.id, 'onboarding_step', String(nextStep));

            // Use the NEXT step's prompt for the response
            systemPrompt = getOnboardingPrompt(nextStep, memoryMap);

            // Mark complete after step 4
            if (nextStep >= 5) {
                await db.updateAgentOnboarding(agent.id);
            }
        } else {
            // Normal chat - adapt system prompt to user's language
            systemPrompt = getDefaultSystemPrompt('Eva', memoryMap.name || req.user.name, language);
        }
        
        // Determine user tier for AI routing
        const userTier = req.user.tier || 'free';

        // ========== NEW: Smart Router with Cache + Cost Tracking ==========
        let response;

        try {
            // Use smart router: checks cache first, then routes to cheapest capable model
            response = await smartRoute(
                message,
                history,
                {
                    userTier,
                    userId: req.user.id,
                    systemPrompt,
                    language: language || 'en',
                    skipCache: !agent.onboarding_complete // Don't cache onboarding
                },
                db // Pass db for cache operations
            );

            // Log routing decision
            console.log(`[SmartRouter] ${response.fromCache ? 'CACHE HIT' : response.model} | Cost: $${(response.cost || 0).toFixed(6)}`);

        } catch (routerError) {
            console.error('[SmartRouter] Error:', routerError.message);

            // Fallback to legacy system
            const errorRecovery = new ErrorRecovery(agent);
            const recovery = await errorRecovery.recover(routerError, {
                task: 'Génération de réponse',
                attempt: 1,
                onRetry: async () => generateResponse({
                    systemPrompt,
                    messages: [...history, { role: 'user', content: message }],
                    memory: memoryMap,
                    userTier,
                    useRouter: false // Direct call, no routing
                })
            });

            if (recovery.recovered) {
                response = recovery.result;
                console.log(`[Recovery] Success with legacy fallback`);
            } else {
                return res.status(500).json({
                    error: recovery.userNotification || 'Erreur lors du chat',
                    recoveryStatus: recovery.strategy
                });
            }
        }

        if (!response.success && !response.content) {
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
                degraded: messagesUsedToday > config.softDegradationThreshold
            },
            // AI routing info (for transparency)
            ai: {
                model: response.model || 'claude-3-5-haiku-20241022',
                provider: response.provider || 'anthropic',
                complexity: response.routing?.complexity || 'unknown',
                tier: userTier,
                fromCache: response.fromCache || false,
                cost: response.cost || 0,
                latency: response.routing?.latency || 0
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

// ========== Knowledge Feedback ==========
// Allow users to rate answers for quality improvement
router.post('/feedback', authMiddleware, async (req, res) => {
    try {
        const { entryId, feedback } = req.body;

        if (!entryId || !['positive', 'negative', 'neutral'].includes(feedback)) {
            return res.status(400).json({ error: 'Invalid feedback' });
        }

        await recordFeedback(entryId, feedback, req.user.id, db);

        res.json({ success: true, message: 'Feedback recorded' });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// ========== Cost Statistics (Admin/Pro only) ==========
router.get('/stats/costs', authMiddleware, async (req, res) => {
    try {
        // Only pro users or admin can see cost stats
        if (req.user.tier !== 'pro' && req.user.tier !== 'admin') {
            return res.status(403).json({ error: 'Pro subscription required' });
        }

        const days = parseInt(req.query.days) || 30;
        const stats = await getCostStats(db, days);

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Cost stats error:', error);
        res.status(500).json({ error: 'Failed to get cost stats' });
    }
});

module.exports = router;
