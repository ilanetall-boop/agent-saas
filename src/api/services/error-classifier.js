// Error Classifier
// Identifier le type d'erreur pour appliquer la bonne stratégie

class ErrorClassifier {
    constructor() {
        // Transient errors (retry auto)
        this.transientPatterns = [
            /timeout/i,
            /ECONNREFUSED/,
            /ECONNRESET/,
            /EHOSTUNREACH/,
            /ENETUNREACH/,
            /5\d{2}/, // HTTP 500-599
            /429/, // Rate limit
            /temporarily unavailable/i,
            /service unavailable/i,
            /try again later/i
        ];
        
        // Logic errors (try alternative)
        this.logicPatterns = [
            /parsing failed/i,
            /invalid format/i,
            /unexpected response/i,
            /malformed/i,
            /null/i,
            /undefined/i,
            /4\d{2}/, // HTTP 400-499 (except 429)
            /selector not found/i,
            /element not found/i,
            /no matching element/i
        ];
        
        // Blocked errors (ask user)
        this.blockedPatterns = [
            /authentication failed/i,
            /unauthorized/i,
            /forbidden/i,
            /access denied/i,
            /permission denied/i,
            /401/,
            /403/,
            /API key invalid/i,
            /credentials invalid/i,
            /quota exceeded/i
        ];
    }
    
    classify(error) {
        const errorString = error.toString() + (error.message || '');
        
        // Check blocked first (highest priority)
        if (this.matches(errorString, this.blockedPatterns)) {
            return {
                type: 'BLOCKED',
                message: error.message || 'Erreur d\'authentification',
                retry: false,
                ask: true
            };
        }
        
        // Check transient
        if (this.matches(errorString, this.transientPatterns)) {
            return {
                type: 'TRANSIENT',
                message: error.message || 'Erreur temporaire',
                retry: true,
                attempt: 0,
                maxAttempts: 3
            };
        }
        
        // Check logic
        if (this.matches(errorString, this.logicPatterns)) {
            return {
                type: 'LOGIC',
                message: error.message || 'Erreur logique',
                retry: false,
                tryAlternative: true
            };
        }
        
        // Default: treat as transient (retry)
        return {
            type: 'UNKNOWN',
            message: error.message || 'Erreur inconnue',
            retry: true,
            attempt: 0,
            maxAttempts: 2
        };
    }
    
    matches(text, patterns) {
        return patterns.some(pattern => pattern.test(text));
    }
    
    getStrategy(classification) {
        switch (classification.type) {
            case 'TRANSIENT':
                return {
                    action: 'retry',
                    backoff: 'exponential', // 1s, 2s, 4s
                    maxAttempts: 3
                };
            
            case 'LOGIC':
                return {
                    action: 'alternate',
                    backoff: 'none',
                    strategies: [
                        'try_alternative_selector',
                        'try_alternative_method',
                        'try_alternative_endpoint'
                    ]
                };
            
            case 'BLOCKED':
                return {
                    action: 'ask_user',
                    backoff: 'none',
                    context: 'detailed_error'
                };
            
            default:
                return {
                    action: 'retry',
                    backoff: 'linear', // 1s, 2s, 3s
                    maxAttempts: 2
                };
        }
    }
}

module.exports = new ErrorClassifier();
