/**
 * N8N Integration Service
 * Connects Eva to external services via N8N workflows
 *
 * Supported integrations:
 * - Gmail (read, send, sort, search)
 * - Google Calendar (create, list, update events)
 * - Google Drive (upload, download, list files)
 * - Slack (send messages, read channels)
 * - Notion (create pages, query databases)
 * - Trello (create cards, move cards)
 * - And more via N8N...
 */

const config = require('../config');

// N8N Configuration
const N8N_CONFIG = {
    baseUrl: process.env.N8N_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
};

// Available integrations and their capabilities
const INTEGRATIONS = {
    gmail: {
        name: 'Gmail',
        icon: '📧',
        actions: ['read', 'send', 'sort', 'search', 'delete', 'label', 'archive'],
        oauth: 'google',
        workflows: {
            sort: 'gmail-sort-emails',
            send: 'gmail-send-email',
            search: 'gmail-search',
            read: 'gmail-read-inbox'
        }
    },
    calendar: {
        name: 'Google Calendar',
        icon: '📅',
        actions: ['create', 'list', 'update', 'delete', 'search'],
        oauth: 'google',
        workflows: {
            create: 'calendar-create-event',
            list: 'calendar-list-events',
            search: 'calendar-search'
        }
    },
    drive: {
        name: 'Google Drive',
        icon: '📁',
        actions: ['upload', 'download', 'list', 'search', 'share', 'delete'],
        oauth: 'google',
        workflows: {
            list: 'drive-list-files',
            search: 'drive-search',
            upload: 'drive-upload'
        }
    },
    slack: {
        name: 'Slack',
        icon: '💬',
        actions: ['send', 'read', 'search', 'create_channel'],
        oauth: 'slack',
        workflows: {
            send: 'slack-send-message',
            read: 'slack-read-channel'
        }
    },
    notion: {
        name: 'Notion',
        icon: '📝',
        actions: ['create_page', 'query', 'update', 'search'],
        oauth: 'notion',
        workflows: {
            create: 'notion-create-page',
            query: 'notion-query-database'
        }
    },
    trello: {
        name: 'Trello',
        icon: '📋',
        actions: ['create_card', 'move_card', 'list_cards', 'add_comment'],
        oauth: 'trello',
        workflows: {
            create: 'trello-create-card',
            list: 'trello-list-cards'
        }
    },
    sheets: {
        name: 'Google Sheets',
        icon: '📊',
        actions: ['read', 'write', 'append', 'create'],
        oauth: 'google',
        workflows: {
            read: 'sheets-read',
            write: 'sheets-write'
        }
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '📱',
        actions: ['send', 'read'],
        oauth: 'whatsapp',
        workflows: {
            send: 'whatsapp-send-message'
        }
    }
};

// Action detection patterns
const ACTION_PATTERNS = {
    gmail: {
        sort: [
            /tri(e|er)?.*mail/i,
            /organis(e|er)?.*mail/i,
            /class(e|er)?.*mail/i,
            /range(r)?.*mail/i,
            /mail.*tri(e|er|és)?/i
        ],
        send: [
            /envoi(e|er)?.*mail/i,
            /écri(s|re)?.*mail/i,
            /send.*email/i,
            /mail.*à/i
        ],
        search: [
            /cherch(e|er)?.*mail/i,
            /trouv(e|er)?.*mail/i,
            /search.*email/i
        ],
        read: [
            /li(s|re)?.*mail/i,
            /montr(e|er)?.*mail/i,
            /affich(e|er)?.*mail/i,
            /inbox/i
        ]
    },
    calendar: {
        create: [
            /ajout(e|er)?.*événement/i,
            /créer?.*rdv/i,
            /planifi(e|er)?/i,
            /réserv(e|er)?/i,
            /schedule/i,
            /book/i
        ],
        list: [
            /agenda/i,
            /calendrier/i,
            /mes.*rdv/i,
            /mes.*événements/i,
            /prochains?.*rdv/i
        ]
    },
    drive: {
        list: [
            /mes.*fichiers/i,
            /mes.*documents/i,
            /dans.*drive/i
        ],
        upload: [
            /upload/i,
            /télévers(e|er)?/i,
            /envoi(e|er)?.*fichier/i
        ]
    },
    slack: {
        send: [
            /envoi(e|er)?.*slack/i,
            /post(e|er)?.*slack/i,
            /message.*slack/i
        ]
    },
    notion: {
        create: [
            /créer?.*notion/i,
            /ajout(e|er)?.*notion/i,
            /note.*notion/i
        ]
    }
};

/**
 * Detect if message requires an external action
 * Returns: { isAction: boolean, service: string, action: string, confidence: number }
 */
function detectAction(message) {
    const text = message.toLowerCase();

    for (const [service, actions] of Object.entries(ACTION_PATTERNS)) {
        for (const [action, patterns] of Object.entries(actions)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return {
                        isAction: true,
                        service,
                        action,
                        confidence: 0.9,
                        integration: INTEGRATIONS[service]
                    };
                }
            }
        }
    }

    return { isAction: false, service: null, action: null, confidence: 0 };
}

/**
 * Check if user has connected a specific service
 */
async function checkUserConnection(userId, service, db) {
    if (!db) return false;

    try {
        const result = await db.query(
            `SELECT * FROM user_integrations
             WHERE user_id = $1 AND service = $2 AND status = 'active'`,
            [userId, service]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking user connection:', error);
        return false;
    }
}

/**
 * Get all user connections
 */
async function getUserConnections(userId, db) {
    if (!db) return [];

    try {
        const result = await db.query(
            `SELECT service, status, connected_at, last_used
             FROM user_integrations
             WHERE user_id = $1`,
            [userId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting user connections:', error);
        return [];
    }
}

/**
 * Save user connection
 */
async function saveUserConnection(userId, service, credentials, db) {
    if (!db) return false;

    try {
        await db.query(
            `INSERT INTO user_integrations (id, user_id, service, credentials, status, connected_at)
             VALUES (gen_random_uuid()::text, $1, $2, $3, 'active', NOW())
             ON CONFLICT (user_id, service)
             DO UPDATE SET credentials = $3, status = 'active', connected_at = NOW()`,
            [userId, service, JSON.stringify(credentials)]
        );
        return true;
    } catch (error) {
        console.error('Error saving user connection:', error);
        return false;
    }
}

/**
 * Execute N8N workflow
 */
async function executeWorkflow(workflowName, data, userId) {
    try {
        const response = await fetch(`${N8N_CONFIG.webhookUrl}/${workflowName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': N8N_CONFIG.apiKey
            },
            body: JSON.stringify({
                userId,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error(`N8N workflow failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('N8N workflow error:', error);
        throw error;
    }
}

/**
 * Generate OAuth connection URL for a service
 */
function getOAuthUrl(service, userId, redirectUrl) {
    const integration = INTEGRATIONS[service];
    if (!integration) return null;

    // This will be handled by N8N's OAuth flow
    const params = new URLSearchParams({
        service,
        userId,
        redirect: redirectUrl
    });

    return `${N8N_CONFIG.baseUrl}/oauth/${integration.oauth}/authorize?${params}`;
}

/**
 * Handle action request from Eva
 * This is the main function called by the chat handler
 */
async function handleAction(userId, service, action, params, db) {
    // Check if user is connected
    const isConnected = await checkUserConnection(userId, service, db);

    if (!isConnected) {
        const integration = INTEGRATIONS[service];
        return {
            success: false,
            needsConnection: true,
            service,
            serviceName: integration?.name || service,
            icon: integration?.icon || '🔗',
            message: `Pour ${action} tes ${service === 'gmail' ? 'mails' : service}, je dois me connecter à ton compte.`,
            oauthUrl: getOAuthUrl(service, userId, '/app.html')
        };
    }

    // Execute the workflow
    const integration = INTEGRATIONS[service];
    const workflowName = integration?.workflows?.[action];

    if (!workflowName) {
        return {
            success: false,
            message: `Action "${action}" non supportée pour ${service}`
        };
    }

    try {
        const result = await executeWorkflow(workflowName, params, userId);

        // Update last_used
        if (db) {
            await db.query(
                `UPDATE user_integrations SET last_used = NOW() WHERE user_id = $1 AND service = $2`,
                [userId, service]
            );
        }

        return {
            success: true,
            service,
            action,
            result
        };
    } catch (error) {
        return {
            success: false,
            message: `Erreur lors de l'exécution: ${error.message}`
        };
    }
}

/**
 * Get available integrations with status for a user
 */
async function getAvailableIntegrations(userId, db) {
    const connections = await getUserConnections(userId, db);
    const connectionMap = new Map(connections.map(c => [c.service, c]));

    return Object.entries(INTEGRATIONS).map(([key, integration]) => ({
        id: key,
        ...integration,
        connected: connectionMap.has(key),
        status: connectionMap.get(key)?.status || 'disconnected',
        lastUsed: connectionMap.get(key)?.last_used || null
    }));
}

/**
 * Generate response for action that needs connection
 */
function generateConnectionPrompt(service, action) {
    const integration = INTEGRATIONS[service];
    if (!integration) return null;

    return {
        type: 'connection_required',
        service,
        serviceName: integration.name,
        icon: integration.icon,
        action,
        message: `${integration.icon} Pour pouvoir ${getActionVerb(action)} sur ${integration.name}, j'ai besoin que tu connectes ton compte.\n\nClique sur "Connecter ${integration.name}" pour m'autoriser.`,
        button: {
            text: `Connecter ${integration.name}`,
            action: 'connect',
            service
        }
    };
}

function getActionVerb(action) {
    const verbs = {
        sort: 'trier tes mails',
        send: 'envoyer des mails',
        read: 'lire tes mails',
        search: 'chercher dans tes mails',
        create: 'créer des événements',
        list: 'voir tes événements',
        upload: 'uploader des fichiers'
    };
    return verbs[action] || action;
}

module.exports = {
    INTEGRATIONS,
    detectAction,
    checkUserConnection,
    getUserConnections,
    saveUserConnection,
    executeWorkflow,
    getOAuthUrl,
    handleAction,
    getAvailableIntegrations,
    generateConnectionPrompt
};
