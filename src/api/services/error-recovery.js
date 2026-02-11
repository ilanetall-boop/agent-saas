/**
 * Error Recovery Strategies
 * Executes smart recovery based on error classification
 */

const { classifyError, shouldRetry } = require('./error-classifier');

class ErrorRecovery {
    constructor(agent) {
        this.agent = agent;
        this.retryLog = {};
    }

    async recover(error, context = {}) {
        const { task, attempt = 1, data = {} } = context;
        
        // Classify error
        const classification = classifyError(error);
        
        console.log(`[Error] Task: ${task} | Type: ${classification.type} | Attempt: ${attempt}`);
        
        // Decide recovery strategy
        if (classification.type === 'transient') {
            return this._handleTransient(error, context, attempt);
        } else if (classification.type === 'logic') {
            return this._handleLogic(error, context, data);
        } else if (classification.type === 'blocked') {
            return this._handleBlocked(error, context, data);
        }
        
        return {
            recovered: false,
            strategy: 'none',
            message: classification.message,
            userNotification: error.message
        };
    }

    async _handleTransient(error, context, attempt) {
        const { task, onRetry } = context;
        
        if (!shouldRetry({ type: 'transient' }, attempt)) {
            return {
                recovered: false,
                strategy: 'max_retries_exceeded',
                message: 'Max retries échoués',
                userNotification: `La tâche "${task}" a échoué après 3 tentatives. Réessayez plus tard.`
            };
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        
        console.log(`[Recovery] Retrying in ${delay}ms (attempt ${attempt})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (onRetry) {
            try {
                const result = await onRetry();
                return {
                    recovered: true,
                    strategy: 'retry',
                    attempt,
                    result,
                    userNotification: null // Silent success
                };
            } catch (retryError) {
                return this.recover(retryError, { ...context, attempt: attempt + 1 });
            }
        }
        
        return {
            recovered: false,
            strategy: 'retry_unavailable',
            message: 'Pas de fonction retry fournie'
        };
    }

    async _handleLogic(error, context, data) {
        const { task } = context;
        
        // Try to fix smart based on error type
        const fix = this._smartFix(error, data);
        
        if (fix) {
            console.log(`[Recovery] Attempting smart fix: ${fix.strategy}`);
            return {
                recovered: true,
                strategy: `fix_${fix.strategy}`,
                fixApplied: fix.fix,
                userNotification: null // Silent fix
            };
        }
        
        // No smart fix available, ask user
        return {
            recovered: false,
            strategy: 'requires_user_input',
            message: `Erreur logique: ${error.message}`,
            userNotification: `Je n'ai pas pu traiter "${task}" à cause d'une erreur de validation. Détail: ${error.message}`
        };
    }

    async _handleBlocked(error, context, data) {
        const { task } = context;
        
        // Try alternative approach if available
        const alternative = this._tryAlternative(error, context);
        
        if (alternative) {
            console.log(`[Recovery] Trying alternative: ${alternative.strategy}`);
            return {
                recovered: true,
                strategy: alternative.strategy,
                alternative: alternative.description,
                userNotification: `"${task}" n'a pas pu être fait comme prévu, j'ai essayé une approche alternative.`
            };
        }
        
        // No alternative, ask user
        return {
            recovered: false,
            strategy: 'requires_user_decision',
            message: error.message,
            userNotification: `Je ne peux pas accéder à "${task}". Raison: ${this._explainError(error)}. Qu'est-ce que tu veux faire?`
        };
    }

    _smartFix(error, data) {
        const errorMsg = error.message.toLowerCase();
        
        // Fix: JSON parse error
        if (errorMsg.includes('json') || errorMsg.includes('parse')) {
            return {
                strategy: 'json_fallback',
                fix: 'Tentative de parsing alternatif'
            };
        }
        
        // Fix: Missing required field
        if (errorMsg.includes('required')) {
            return {
                strategy: 'fill_defaults',
                fix: 'Remplissage des champs par défaut'
            };
        }
        
        // Fix: Type mismatch
        if (errorMsg.includes('type')) {
            return {
                strategy: 'type_coercion',
                fix: 'Conversion de type'
            };
        }
        
        return null;
    }

    _tryAlternative(error, context) {
        const { task } = context;
        const errorMsg = error.message.toLowerCase();
        
        // Alternative: Try different API endpoint
        if (errorMsg.includes('not found')) {
            return {
                strategy: 'alternative_source',
                description: 'Essai d\'une source alternative'
            };
        }
        
        // Alternative: Try different format
        if (errorMsg.includes('format') || errorMsg.includes('invalid')) {
            return {
                strategy: 'alternative_format',
                description: 'Tentative avec un format différent'
            };
        }
        
        // Alternative: Use cache/previous result
        if (errorMsg.includes('timeout') || errorMsg.includes('unavailable')) {
            return {
                strategy: 'use_cache',
                description: 'Utilisation des données précédentes'
            };
        }
        
        return null;
    }

    _explainError(error) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('404') || msg.includes('not found')) {
            return 'La ressource n\'existe pas';
        }
        if (msg.includes('403') || msg.includes('forbidden')) {
            return 'Accès refusé (permissions insuffisantes)';
        }
        if (msg.includes('401') || msg.includes('unauthorized')) {
            return 'Authentification requise';
        }
        if (msg.includes('timeout')) {
            return 'Le serveur ne répond pas assez vite';
        }
        
        return error.message;
    }
}

module.exports = ErrorRecovery;
