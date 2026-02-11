// Error Recovery Service
// Appliquer les stratégies de recovery selon le type d'erreur

const errorClassifier = require('./error-classifier');

class ErrorRecovery {
    constructor() {
        this.retryBackoffMs = 1000; // Start at 1s
    }
    
    async handle(error, context = {}) {
        // Classifier l'erreur
        const classification = errorClassifier.classify(error);
        const strategy = errorClassifier.getStrategy(classification);
        
        console.log(`📊 Error classified as ${classification.type}:`, classification.message);
        console.log(`📋 Strategy: ${strategy.action}`);
        
        // Exécuter la stratégie appropriée
        switch (strategy.action) {
            case 'retry':
                return await this.executeRetry(context, strategy, classification);
            
            case 'alternate':
                return await this.tryAlternative(context, strategy, classification);
            
            case 'ask_user':
                return this.askUser(classification, context);
            
            default:
                throw new Error(`Unknown recovery strategy: ${strategy.action}`);
        }
    }
    
    async executeRetry(context, strategy, classification) {
        const { fn, maxAttempts = strategy.maxAttempts } = context;
        
        if (!fn || typeof fn !== 'function') {
            throw new Error('No function provided for retry');
        }
        
        let lastError;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                console.log(`🔄 Retry attempt ${attempt + 1}/${maxAttempts}...`);
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxAttempts - 1) {
                    // Calculate backoff
                    let delayMs;
                    if (strategy.backoff === 'exponential') {
                        delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                    } else if (strategy.backoff === 'linear') {
                        delayMs = 1000 * (attempt + 1); // 1s, 2s, 3s
                    } else {
                        delayMs = 1000; // Fixed 1s
                    }
                    
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await this.sleep(delayMs);
                } else {
                    console.log(`❌ Retry exhausted after ${maxAttempts} attempts`);
                }
            }
        }
        
        return {
            success: false,
            error: lastError.message,
            type: 'RETRY_EXHAUSTED',
            recommendation: '❌ Tous les tentatives ont échoué. Vérifiez votre connexion internet.'
        };
    }
    
    async tryAlternative(context, strategy, classification) {
        const { browser, url, originalSelector } = context;
        
        console.log('🔀 Trying alternative approach...');
        
        // Stratégie 1: Try alternative CSS selector
        if (strategy.strategies.includes('try_alternative_selector')) {
            try {
                console.log('  → Essai: sélecteur alternatif...');
                const alternatives = [
                    '[role="button"]',
                    '.btn',
                    'button',
                    '[type="submit"]'
                ];
                
                for (const selector of alternatives) {
                    if (selector !== originalSelector) {
                        try {
                            if (browser && browser.page) {
                                await browser.page.click(selector);
                                return { success: true, used: `alternative_selector: ${selector}` };
                            }
                        } catch (e) {
                            continue; // Try next
                        }
                    }
                }
            } catch (e) {
                console.log('  → Échec sélecteur alternatif');
            }
        }
        
        // Stratégie 2: Try alternative method (XPath instead of CSS)
        if (strategy.strategies.includes('try_alternative_method')) {
            try {
                console.log('  → Essai: méthode XPath...');
                if (browser && browser.page) {
                    await browser.page.click('[type="submit"]');
                    return { success: true, used: 'alternative_method: xpath' };
                }
            } catch (e) {
                console.log('  → Échec XPath');
            }
        }
        
        // Stratégie 3: Try alternative endpoint/URL
        if (strategy.strategies.includes('try_alternative_endpoint')) {
            try {
                console.log('  → Essai: endpoint alternatif...');
                const alternatives = [
                    url.replace('https://', 'http://'), // Try HTTP
                    url.replace('/api/v1/', '/api/v2/'), // Try different API version
                    url.replace(/\/$/, '') // Remove trailing slash
                ];
                
                for (const altUrl of alternatives) {
                    if (altUrl !== url) {
                        console.log(`    Trying ${altUrl}...`);
                        // Try calling function with new URL
                        if (context.fnWithUrl) {
                            try {
                                return await context.fnWithUrl(altUrl);
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('  → Échec endpoint alternatif');
            }
        }
        
        return {
            success: false,
            error: classification.message,
            type: 'ALTERNATIVE_FAILED',
            recommendation: '⚠️ Toutes les approches alternatives ont échoué. Le problème peut être plus grave.'
        };
    }
    
    askUser(classification, context = {}) {
        const { url, message } = context;
        
        return {
            success: false,
            error: classification.message,
            type: 'REQUIRES_USER_INPUT',
            recommendation: '❓ Je suis bloqué et j\'ai besoin de ton aide.',
            details: {
                problem: classification.message,
                url: url,
                userMessage: message,
                suggestions: [
                    'Vérifier les identifiants',
                    'Vérifier la limite API',
                    'Vérifier les permissions',
                    'Réessayer manuellement'
                ]
            }
        };
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ErrorRecovery();
