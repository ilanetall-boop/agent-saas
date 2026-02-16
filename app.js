// MyBestAgent App - External script (avoids CSP inline script violation)

const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('accessToken') || localStorage.getItem('token'); // Support both names for backward compatibility
let user = null;
let agent = null;

// Wrap initialization in DOMContentLoaded to avoid CSP violations
document.addEventListener('DOMContentLoaded', function() {
    // Check auth on load
    if (token) {
        checkAuth();
    } else {
        // No token, show login
        window.location.href = '/index.html';
    }
});

async function checkAuth() {
    try {
        console.log('🔐 checkAuth: token =', token ? token.substring(0, 20) + '...' : 'null');
        console.log('📡 checkAuth: fetching', `${API_URL}/auth/verify-token`);
        
        const res = await fetch(`${API_URL}/auth/verify-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 checkAuth: response status =', res.status);
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ checkAuth: token verified, user =', data.user.email);
            user = data.user;
            document.getElementById('userInfo').textContent = user.name || user.email;
            await loadAgent();
            showChat();
        } else {
            console.error('❌ checkAuth: token invalid, status =', res.status);
            const errorData = await res.json();
            console.error('❌ checkAuth: error =', errorData);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            token = null;
            window.location.href = '/index.html';
        }
    } catch (e) {
        console.error('❌ checkAuth: exception =', e.message);
        window.location.href = '/index.html';
    }
}

async function loadAgent() {
    try {
        const res = await fetch(`${API_URL}/agent/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            agent = data.agent;
            document.getElementById('agentName').textContent = agent.name || i18nInstance.t('chat.my_agent');
        }
    } catch (e) {
        console.error('Load agent failed:', e);
    }
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showChat() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    document.getElementById('userInfo').textContent = user.email;
    updateTierBadge();
    updateUsage();
    
    // Welcome message if first time
    if (!agent.onboardingComplete) {
        addMessage('assistant', "Salut ! Moi c'est Eva, ton assistante IA. Et toi, tu t'appelles comment ?");
    }
}

function updateTierBadge() {
    const tierBadge = document.getElementById('tierBadge');
    const tier = user.tier || 'starter';
    
    tierBadge.className = `tier-badge ${tier.toLowerCase()}`;
    tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    
    // Show upgrade banner for free users
    if (tier === 'starter' && !document.getElementById('upgradeBanner')) {
        const chatHeader = document.querySelector('.chat-header');
        const banner = document.createElement('div');
        banner.id = 'upgradeBanner';
        banner.className = 'upgrade-banner';
        banner.innerHTML = `
            <span>🚀 ${i18nInstance.t('chat.upgrade_message') || 'Upgrade to Pro for unlimited messages and all AI models'}</span>
            <a href="/#pricing">${i18nInstance.t('chat.upgrade_button') || 'Go Pro →'}</a>
        `;
        chatHeader.parentNode.insertBefore(banner, chatHeader.nextSibling);
    }
}

function updateUsage() {
    // Usage bar removed - function kept for compatibility
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        errorEl.textContent = i18nInstance.t('errors.fill_all_fields');
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.accessToken || data.token;
            user = data.user;
            localStorage.setItem('accessToken', token);
            localStorage.setItem('token', token); // Backward compatibility
            await loadAgent();
            showChat();
        } else {
            errorEl.textContent = data.error || i18nInstance.t('errors.login_failed');
            errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.textContent = i18nInstance.t('errors.network_error');
        errorEl.classList.remove('hidden');
    }
}

async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');

    if (!email || !password) {
        errorEl.textContent = i18nInstance.t('errors.fill_all_fields');
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.accessToken || data.token;
            user = data.user;
            agent = data.agent;
            localStorage.setItem('accessToken', token);
            localStorage.setItem('token', token); // Backward compatibility
            
            // Show verification modal
            showVerificationModal(email);
            
            // Auto-load chat in 3 seconds (for testing)
            setTimeout(() => {
                closeVerificationModal();
                showChat();
            }, 3000);
        } else {
            errorEl.textContent = data.error || i18nInstance.t('errors.register_failed');
            errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.textContent = i18nInstance.t('errors.network_error');
        errorEl.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    token = null;
    user = null;
    agent = null;
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
    window.location.href = '/index.html';
}

// Eva avatar - Simple clean emoji style (girl with cap)
const EVA_AVATAR = '👩‍🦰';

function addMessage(role, content, aiInfo = null) {
    const messagesEl = document.getElementById('chatMessages');
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    // Helper to escape HTML entities
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Process code blocks FIRST - escape HTML inside them
    let formatted = content
        .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return '<pre><code>' + escapeHtml(code) + '</code></pre>';
        })
        .replace(/`([^`]+)`/g, (match, code) => {
            return '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">' + escapeHtml(code) + '</code>';
        })
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    // Model indicator for assistant messages (detailed for testing period)
    let modelIndicator = '';
    if (role === 'assistant' && aiInfo) {
        const modelName = formatModelName(aiInfo.model || 'unknown');
        const complexityEmoji = getComplexityEmoji(aiInfo.complexity);
        const cost = aiInfo.cost ? `$${aiInfo.cost.toFixed(6)}` : '';
        const latency = aiInfo.latency ? `${aiInfo.latency}ms` : '';
        const cacheIcon = aiInfo.fromCache ? '⚡ CACHE' : '';
        const provider = aiInfo.provider || '';

        const details = [cacheIcon, modelName, provider, cost, latency].filter(Boolean).join(' · ');
        modelIndicator = `<div class="model-indicator" style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${complexityEmoji} ${details}</div>`;
    }

    // Avatar: user profile pic (from Google/GitHub) or emoji, Eva SVG for assistant
    let avatarContent;
    let avatarStyle = '';

    if (role === 'user') {
        // Check if user has a profile picture (from Google/GitHub OAuth)
        if (user && user.avatar_url) {
            console.log('👤 User avatar URL:', user.avatar_url);
            avatarContent = `<img src="${user.avatar_url}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.innerHTML='👤'">`;
            avatarStyle = 'background:none;padding:0;overflow:hidden;';
        } else {
            console.log('👤 No avatar URL, using emoji. User:', user);
            avatarContent = '👤';
        }
    } else {
        // Eva avatar
        avatarContent = EVA_AVATAR;
    }

    msgEl.innerHTML = `
        <div class="avatar" style="${avatarStyle}">${avatarContent}</div>
        <div class="bubble-wrapper">
            <div class="bubble">${formatted}</div>
            ${modelIndicator}
        </div>
    `;
    
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Format model name for display
function formatModelName(model) {
    const modelNames = {
        'mistral-small-latest': 'Mistral Small',
        'mistral-medium-latest': 'Mistral Medium',
        'mistral-large-latest': 'Mistral Large',
        'claude-3-5-haiku-20241022': 'Haiku',
        'claude-3-5-sonnet-20241022': 'Sonnet',
        'claude-opus-4-5': 'Opus',
        'gpt-3.5-turbo': 'GPT-3.5',
        'gpt-4-turbo-preview': 'GPT-4',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gemini-1.5-flash': 'Gemini Flash',
        'gemini-1.5-pro': 'Gemini Pro',
        'cache': '⚡ Cache',
        'knowledge-cache': '⚡ Cache'
    };
    return modelNames[model] || model;
}

// Get emoji for complexity level
function getComplexityEmoji(complexity) {
    const emojis = {
        'simple': '💬',
        'code': '💻',
        'analysis': '📊',
        'complex': '🧠'
    };
    return emojis[complexity] || '⚡';
}

function addTypingIndicator() {
    const messagesEl = document.getElementById('chatMessages');
    const typingEl = document.createElement('div');
    typingEl.className = 'message';
    typingEl.id = 'typingIndicator';
    typingEl.innerHTML = `
        <div class="avatar">${EVA_AVATAR}</div>
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input.value.trim();

    if (!message) return;

    input.disabled = true;
    sendBtn.disabled = true;
    input.value = '';

    addMessage('user', message);
    addTypingIndicator();

    try {
        // Get current language from i18n instance if available
        const language = (typeof i18nInstance !== 'undefined' && i18nInstance.currentLanguage) 
            ? i18nInstance.currentLanguage 
            : localStorage.getItem('language') || 'en';
        
        const res = await fetch(`${API_URL}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, language })
        });

        removeTypingIndicator();

        if (res.ok) {
            const data = await res.json();
            // Pass AI routing info to show model used
            addMessage('assistant', data.response, data.ai || null);

            // Show connection button if Eva needs to connect to a service
            if (data.action && data.action.needsConnection) {
                const connectionData = data.action.connectionData;
                const connectionCard = document.createElement('div');
                connectionCard.className = 'connection-required-card';
                connectionCard.innerHTML = `
                    <div class="connection-card-icon">${connectionData.icon || '🔗'}</div>
                    <div class="connection-card-text">
                        <strong>Connexion requise</strong>
                        <p>Connecte ${connectionData.serviceName} pour que je puisse agir</p>
                    </div>
                    <button class="connection-card-btn" data-service="${connectionData.service}">
                        Connecter ${connectionData.serviceName}
                    </button>
                `;
                document.getElementById('chatMessages').appendChild(connectionCard);
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;

                // Add click handler
                connectionCard.querySelector('.connection-card-btn').addEventListener('click', (e) => {
                    connectService(e.target.dataset.service);
                });
            }

            // Show site deployment link if Eva created a site
            if (data.site && data.site.url) {
                const siteCard = document.createElement('div');
                siteCard.className = 'site-deployed-card';
                siteCard.innerHTML = `
                    <div class="site-deployed-header">🚀 Site déployé !</div>
                    <a href="${data.site.url}" target="_blank" class="site-deployed-link">
                        <span class="site-icon">🌐</span>
                        <span class="site-url">${data.site.url}</span>
                    </a>
                    <div class="site-deployed-hint">Clique pour voir ton site en ligne</div>
                `;
                document.getElementById('chatMessages').appendChild(siteCard);
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            }

            // Show degradation warning if applicable (usage bar removed)
            // if (data.usage && data.usage.degraded) { ... }
        } else {
            removeTypingIndicator();
            const data = await res.json();
            const errorMsg = data.error || i18nInstance.t('errors.chat_error');
            addMessage('assistant', `Error: ${errorMsg}`);
        }
    } catch (e) {
        removeTypingIndicator();
        console.error('❌ Chat error:', e);
        const errorMsg = e.message.includes('Unexpected') || e.message.includes('JSON') 
            ? i18nInstance.t('errors.chat_error') || 'Server error. Please try again.'
            : e.message;
        addMessage('assistant', `${i18nInstance.t('errors.network_error')}: ${errorMsg}`);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
}

// Telegram Functions
function openTelegramModal() {
    document.getElementById('telegramModal').style.display = 'flex';
    document.getElementById('telegramToken').focus();
}

function closeTelegramModal() {
    document.getElementById('telegramModal').style.display = 'none';
    document.getElementById('telegramToken').value = '';
    document.getElementById('telegramError').style.display = 'none';
    document.getElementById('telegramSuccess').style.display = 'none';
}

async function linkTelegramBot() {
    const tokenInput = document.getElementById('telegramToken');
    const botToken = tokenInput.value.trim();
    const errorEl = document.getElementById('telegramError');
    const successEl = document.getElementById('telegramSuccess');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!botToken) {
        errorEl.textContent = i18nInstance.t('telegram.token_placeholder');
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/telegram/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ botToken })
        });

        const data = await res.json();

        if (res.ok) {
            successEl.textContent = i18nInstance.t('telegram.success');
            successEl.style.display = 'block';
            tokenInput.value = '';
            setTimeout(() => {
                closeTelegramModal();
            }, 2000);
        } else {
            errorEl.textContent = data.error || i18nInstance.t('errors.chat_error');
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = `${i18nInstance.t('errors.network_error')}: ${e.message}`;
        errorEl.style.display = 'block';
    }
}

// ==========================================
// INTEGRATIONS / CONNEXIONS (100+ services)
// ==========================================

// Fetched from backend API
let INTEGRATIONS = {};
let CATEGORIES = {};
let INTEGRATIONS_BY_CATEGORY = {};
let userConnections = [];
let searchQuery = '';

function openConnectionsModal() {
    document.getElementById('connectionsModal').style.display = 'flex';
    loadIntegrations();
}

function closeConnectionsModal() {
    document.getElementById('connectionsModal').style.display = 'none';
}

async function loadIntegrations() {
    const grid = document.getElementById('integrationsGrid');
    grid.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Chargement des 100+ intégrations...</div>';

    try {
        // Fetch integrations and user's connections from backend
        const res = await fetch(`${API_URL}/integrations/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            userConnections = data.connections || [];
            CATEGORIES = data.categories || {};
            INTEGRATIONS_BY_CATEGORY = data.byCategory || {};

            // Build flat INTEGRATIONS map for lookup
            INTEGRATIONS = {};
            (data.available || []).forEach(int => {
                INTEGRATIONS[int.id] = int;
            });
        }
    } catch (e) {
        console.error('Failed to load integrations:', e);
        userConnections = [];
    }

    renderIntegrations();
}

function renderIntegrations() {
    const grid = document.getElementById('integrationsGrid');
    const connectionMap = new Map(userConnections.map(c => [c.service, c]));

    // Check if we have data
    if (Object.keys(INTEGRATIONS_BY_CATEGORY).length === 0) {
        grid.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Aucune intégration disponible</div>';
        return;
    }

    // Build HTML for each category
    let html = '';

    // Add search bar
    html += `
        <div class="integrations-search">
            <input type="text" id="integrationSearch" placeholder="🔍 Rechercher parmi 100+ services..."
                   value="${searchQuery}" autocomplete="off">
        </div>
    `;

    // Count total and connected
    const totalCount = Object.keys(INTEGRATIONS).length;
    const connectedCount = userConnections.filter(c => c.status === 'active').length;
    html += `<div class="integrations-stats">${connectedCount} connecté(s) sur ${totalCount} disponibles</div>`;

    // Render by category
    for (const [categoryKey, categoryData] of Object.entries(INTEGRATIONS_BY_CATEGORY)) {
        const integrations = categoryData.integrations || [];

        // Filter by search query
        const filtered = integrations.filter(int => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return int.name.toLowerCase().includes(q) ||
                   (int.description && int.description.toLowerCase().includes(q));
        });

        if (filtered.length === 0) continue;

        html += `
            <div class="integration-category">
                <div class="category-header">
                    <span class="category-icon">${categoryData.icon || '📦'}</span>
                    <span class="category-name">${categoryData.name}</span>
                    <span class="category-count">${filtered.length}</span>
                </div>
                <div class="category-integrations">
        `;

        for (const integration of filtered) {
            const connection = connectionMap.get(integration.id);
            const isConnected = connection && connection.status === 'active';

            html += `
                <div class="integration-card ${isConnected ? 'connected' : ''}">
                    <div class="integration-header">
                        <div class="integration-icon">${integration.icon}</div>
                        <div class="integration-info">
                            <h4>${integration.name}</h4>
                            <span>${integration.description || ''}</span>
                        </div>
                    </div>
                    <button class="integration-btn ${isConnected ? 'disconnect' : 'connect'}"
                            data-service="${integration.id}"
                            data-connected="${isConnected}">
                        ${isConnected ? '✓ Connecté' : 'Connecter'}
                    </button>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;

    // Add search handler
    const searchInput = document.getElementById('integrationSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderIntegrations();
            // Re-focus search input after re-render
            document.getElementById('integrationSearch')?.focus();
        });
    }

    // Add click handlers for integration buttons
    grid.querySelectorAll('.integration-btn').forEach(btn => {
        btn.addEventListener('click', handleIntegrationClick);
    });
}

async function handleIntegrationClick(e) {
    const service = e.target.dataset.service;
    const isConnected = e.target.dataset.connected === 'true';

    if (isConnected) {
        await disconnectService(service);
    } else {
        await connectService(service);
    }
}

async function connectService(service) {
    const integration = INTEGRATIONS[service];
    const serviceName = integration?.name || service;

    // Map service to OAuth service name
    const googleServices = ['gmail', 'calendar', 'drive'];

    if (googleServices.includes(service)) {
        // Use our OAuth routes for Google services
        try {
            const res = await fetch(`${API_URL}/oauth/services/google/authorize?service=${service}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    // Redirect to OAuth
                    window.location.href = data.url;
                } else {
                    alert(`Erreur: URL OAuth non disponible`);
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Erreur de connexion OAuth');
            }
        } catch (e) {
            console.error('OAuth connect error:', e);
            alert(`Erreur de connexion à ${serviceName}: ${e.message}`);
        }
    } else {
        // For other services, use old integrations endpoint
        try {
            const res = await fetch(`${API_URL}/integrations/connect/${service}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.oauthUrl) {
                    window.open(data.oauthUrl, '_blank', 'width=600,height=700');
                } else {
                    alert(`🔗 ${serviceName} n'est pas encore configuré.\nContactez l'administrateur.`);
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Erreur de connexion');
            }
        } catch (e) {
            console.error('Connect error:', e);
            alert(`Erreur de connexion à ${serviceName}`);
        }
    }
}

async function disconnectService(service) {
    const integration = INTEGRATIONS[service];
    const serviceName = integration?.name || service;

    if (!confirm(`Déconnecter ${serviceName}?`)) return;

    try {
        const res = await fetch(`${API_URL}/integrations/disconnect/${service}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadIntegrations(); // Refresh
        }
    } catch (e) {
        console.error('Disconnect error:', e);
    }
}

// Email Verification
function showVerificationModal(email) {
    document.getElementById('verificationEmail').textContent = email;
    document.getElementById('verificationModal').style.display = 'flex';
    document.getElementById('verificationError').style.display = 'none';
    document.getElementById('verificationSuccess').style.display = 'none';
}

function closeVerificationModal() {
    document.getElementById('verificationModal').style.display = 'none';
}

async function resendVerificationEmail() {
    const email = document.getElementById('verificationEmail').textContent;
    const errorEl = document.getElementById('verificationError');
    const successEl = document.getElementById('verificationSuccess');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.ok) {
            successEl.textContent = '✅ ' + i18nInstance.t('verification.check_email');
            successEl.style.display = 'block';
        } else {
            const data = await res.json();
            errorEl.textContent = data.error || i18nInstance.t('errors.verification_failed');
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = `${i18nInstance.t('errors.network_error')}: ${e.message}`;
        errorEl.style.display = 'block';
    }
}

// OAuth Stubs
function loginGoogle() {
    const email = prompt('Google OAuth not yet configured. Enter your email to test:');
    if (email) {
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = 'oauth-google';
    }
}

function loginGithub() {
    const email = prompt('GitHub OAuth not yet configured. Enter your email to test:');
    if (email) {
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = 'oauth-github';
    }
}
