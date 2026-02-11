/**
 * Error Classifier
 * Categorizes errors into: transient, logic, or blocked
 * 
 * Transient: Retry auto (network, timeouts)
 * Logic: Fix smart (validation, parsing)
 * Blocked: Ask user (permission, resource not found)
 */

const ERROR_PATTERNS = {
    transient: [
        /timeout/i,
        /ECONNREFUSED/,
        /ECONNRESET/,
        /ETIMEDOUT/,
        /socket hang up/i,
        /network error/i,
        /temporarily unavailable/i,
        /please try again/i,
        /rate limit/i,
        /too many requests/i,
        /503|502|504/
    ],
    logic: [
        /invalid format/i,
        /parse error/i,
        /unexpected token/i,
        /malformed/i,
        /syntax error/i,
        /json.parse/i,
        /validation failed/i,
        /required field/i,
        /type mismatch/i
    ],
    blocked: [
        /permission denied/i,
        /forbidden/i,
        /unauthorized/i,
        /not found/i,
        /does not exist/i,
        /404/,
        /403/,
        /401/,
        /access denied/i,
        /invalid credentials/i,
        /expired/i
    ]
};

function classifyError(error) {
    const errorMsg = (error.message || String(error)).toLowerCase();
    const errorCode = error.code || error.status || '';
    
    // Check against transient patterns
    for (const pattern of ERROR_PATTERNS.transient) {
        if (pattern.test(errorMsg) || pattern.test(String(errorCode))) {
            return {
                type: 'transient',
                message: 'Erreur réseau temporaire',
                retryable: true,
                originalError: error
            };
        }
    }
    
    // Check against logic patterns
    for (const pattern of ERROR_PATTERNS.logic) {
        if (pattern.test(errorMsg)) {
            return {
                type: 'logic',
                message: 'Erreur de logique/validation',
                retryable: false,
                originalError: error,
                requiresFix: true
            };
        }
    }
    
    // Check against blocked patterns
    for (const pattern of ERROR_PATTERNS.blocked) {
        if (pattern.test(errorMsg) || pattern.test(String(errorCode))) {
            return {
                type: 'blocked',
                message: 'Ressource inaccessible',
                retryable: false,
                originalError: error,
                requiresUser: true
            };
        }
    }
    
    // Default: assume transient for unknown errors
    return {
        type: 'unknown',
        message: 'Erreur inconnue',
        retryable: true,
        originalError: error
    };
}

function shouldRetry(classification, attempt = 1) {
    const maxRetries = {
        transient: 3,
        logic: 1,
        blocked: 0,
        unknown: 2
    };
    
    return attempt <= maxRetries[classification.type];
}

module.exports = {
    classifyError,
    shouldRetry,
    ERROR_PATTERNS
};
