/**
 * Anonymization Service
 * Removes PII (Personally Identifiable Information) from user data
 * Ensures GDPR/RGPD compliance in Knowledge Base sharing
 */

/**
 * Remove all PII from feedback text
 * @param {string} text - Original text with PII
 * @returns {string} Anonymized text
 */
function anonymizeFeedback(text) {
    if (!text) return '';

    let anonymized = text;

    // Remove email addresses
    anonymized = anonymized.replace(
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g,
        '[EMAIL]'
    );

    // Remove common names (French + English)
    const commonNames = [
        'jean', 'marie', 'pierre', 'anne', 'paul', 'caroline', 'david', 'sophie',
        'john', 'jane', 'alice', 'bob', 'charlie', 'eve', 'frank', 'grace',
        'ilane', 'eva', 'claude', 'francois', 'marie', 'chris'
    ];

    commonNames.forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, 'gi');
        anonymized = anonymized.replace(regex, '[USER]');
    });

    // Remove company names
    const companies = [
        'google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta',
        'acme', 'company', 'corp', 'inc', 'ltd', 'startup',
        'enterprise', 'organization', 'bureau', 'societe'
    ];

    companies.forEach(company => {
        const regex = new RegExp(`\\b${company}\\b`, 'gi');
        anonymized = anonymized.replace(regex, '[COMPANY]');
    });

    // Remove URLs
    anonymized = anonymized.replace(
        /https?:\/\/[^\s]+/g,
        '[URL]'
    );

    // Remove IP addresses
    anonymized = anonymized.replace(
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        '[IP]'
    );

    // Remove phone numbers (various formats)
    anonymized = anonymized.replace(
        /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g,
        '[PHONE]'
    );

    // Remove credit card numbers
    anonymized = anonymized.replace(
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        '[CARD]'
    );

    // Remove social security numbers
    anonymized = anonymized.replace(
        /\b\d{3}-\d{2}-\d{4}\b/g,
        '[SSN]'
    );

    // Clean up multiple spaces
    anonymized = anonymized.replace(/\s+/g, ' ').trim();

    return anonymized;
}

/**
 * Extract PII from text for audit logging
 * @param {string} text - Original text
 * @returns {object} PII found
 */
function extractPII(text) {
    if (!text) return { found: false };

    const pii = {
        found: false,
        emails: [],
        urls: [],
        phones: [],
        companies: []
    };

    // Extract emails
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g;
    const emailMatches = text.match(emailRegex);
    if (emailMatches) {
        pii.emails = emailMatches;
        pii.found = true;
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urlMatches = text.match(urlRegex);
    if (urlMatches) {
        pii.urls = urlMatches;
        pii.found = true;
    }

    // Extract phone numbers
    const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g;
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches) {
        pii.phones = phoneMatches;
        pii.found = true;
    }

    return pii;
}

/**
 * Create anonymized user profile for display
 * @param {object} user - User object
 * @returns {object} Safe user profile
 */
function anonymizeUserProfile(user) {
    return {
        user_id: user.id,
        contributions: user.contributions_count || 0,
        impact: `${user.solutions_helped_count || 0} users helped`,
        // NO name, email, or personal data
    };
}

/**
 * Create anonymized solution usage summary
 * @param {object} usage - Usage record
 * @returns {object} Anonymized usage
 */
function anonymizeUsageRecord(usage) {
    return {
        success: usage.success,
        time_minutes: usage.time_taken_minutes,
        feedback: anonymizeFeedback(usage.feedback),
        // NO user_id, private data
    };
}

/**
 * Validate that shared data contains no PII
 * @param {string} data - Data to validate
 * @returns {boolean} true if safe to share
 */
function isSafeToShare(data) {
    if (!data) return true;

    const pii = extractPII(data);
    
    if (pii.found) {
        console.warn('[Anonymization] PII detected in data to be shared:', {
            emails: pii.emails.length,
            urls: pii.urls.length,
            phones: pii.phones.length,
            companies: pii.companies.length
        });
        return false;
    }

    return true;
}

/**
 * Mask sensitive fields in solution data
 * @param {object} solution - Solution object
 * @returns {object} Masked solution
 */
function maskSensitiveFields(solution) {
    const masked = { ...solution };

    // Don't share creator ID
    delete masked.created_by_user_id;

    // Mask solution text of any PII before sharing
    if (masked.solution) {
        masked.solution = anonymizeFeedback(masked.solution);
    }

    // Mask error descriptions
    if (masked.errors_encountered && Array.isArray(masked.errors_encountered)) {
        masked.errors_encountered = masked.errors_encountered.map(e => 
            anonymizeFeedback(e)
        );
    }

    return masked;
}

/**
 * Create audit log for PII removal
 * @param {string} userId - User ID (already safe)
 * @param {string} action - Action taken
 * @param {object} piiFound - PII found during sanitization
 */
function logAnonymization(userId, action, piiFound) {
    console.log('[Anonymization Audit]', {
        user_id: userId,
        action: action,
        pii_types: Object.keys(piiFound).filter(k => piiFound[k] && piiFound[k].length > 0),
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    anonymizeFeedback,
    extractPII,
    anonymizeUserProfile,
    anonymizeUsageRecord,
    isSafeToShare,
    maskSensitiveFields,
    logAnonymization
};
