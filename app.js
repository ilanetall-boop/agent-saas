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
    const tier = user.tier || 'starter';
    const usageText = document.getElementById('usageText');
    
    if (tier === 'pro') {
        usageText.textContent = '✅ Pro - ' + (i18nInstance.t('chat.unlimited') || 'Unlimited messages');
    } else {
        const messagesUsed = user.messagesUsed || 0;
        const limit = 30;
        usageText.textContent = `📊 ${messagesUsed}/${limit} ` + (i18nInstance.t('chat.messages_today') || 'messages today');
        
        // Show warning if approaching limit
        if (messagesUsed >= limit * 0.8) {
            usageText.innerHTML += ` <span style="color:#ff9800;">⚠️</span>`;
        }
    }
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

// Eva avatar SVG - Girl with long brown hair and red NY Yankees cap
const EVA_AVATAR_SVG = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <!-- Hair background (long brown hair) -->
  <ellipse cx="18" cy="22" rx="14" ry="14" fill="#5D4037"/>
  <path d="M4 22c0-2 1-8 5-12 0 3 1 6 3 8-1 2-2 6-2 10v8H4v-14z" fill="#5D4037"/>
  <path d="M32 22c0-2-1-8-5-12 0 3-1 6-3 8 1 2 2 6 2 10v8h6v-14z" fill="#5D4037"/>
  <!-- Face -->
  <ellipse cx="18" cy="20" rx="10" ry="11" fill="#FFCC80"/>
  <!-- Hair strands on face -->
  <path d="M8 16c2-6 6-8 10-8s8 2 10 8c-3-3-6-4-10-4s-7 1-10 4z" fill="#5D4037"/>
  <!-- Red NY Yankees cap -->
  <ellipse cx="18" cy="10" rx="12" ry="5" fill="#C62828"/>
  <rect x="6" y="8" width="24" height="4" rx="2" fill="#C62828"/>
  <path d="M10 8c0-4 4-6 8-6s8 2 8 6H10z" fill="#C62828"/>
  <!-- NY logo on cap -->
  <text x="18" y="10" text-anchor="middle" fill="white" font-size="5" font-weight="bold" font-family="Arial">NY</text>
  <!-- Cap brim -->
  <ellipse cx="18" cy="12" rx="10" ry="2" fill="#8B0000"/>
  <!-- Eyes -->
  <ellipse cx="14" cy="19" rx="1.5" ry="2" fill="#3E2723"/>
  <ellipse cx="22" cy="19" rx="1.5" ry="2" fill="#3E2723"/>
  <circle cx="14.5" cy="18.5" r="0.5" fill="white"/>
  <circle cx="22.5" cy="18.5" r="0.5" fill="white"/>
  <!-- Eyebrows -->
  <path d="M11 16c1-1 2-1 4 0" stroke="#5D4037" stroke-width="0.5" fill="none"/>
  <path d="M21 16c1-1 3-1 4 0" stroke="#5D4037" stroke-width="0.5" fill="none"/>
  <!-- Nose -->
  <path d="M18 20v3" stroke="#E0A070" stroke-width="0.8" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M14 25c2 2 6 2 8 0" stroke="#C62828" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="12" cy="23" rx="2" ry="1" fill="#FFAB91" opacity="0.5"/>
  <ellipse cx="24" cy="23" rx="2" ry="1" fill="#FFAB91" opacity="0.5"/>
</svg>`;

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

    // Avatar: user emoji or Eva SVG
    const avatarContent = role === 'user' ? '👤' : EVA_AVATAR_SVG;

    msgEl.innerHTML = `
        <div class="avatar" style="${role !== 'user' ? 'background:none;padding:0;' : ''}">${avatarContent}</div>
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
        <div class="avatar" style="background:none;padding:0;">${EVA_AVATAR_SVG}</div>
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

            // Show degradation warning if applicable
            if (data.usage && data.usage.degraded) {
                document.getElementById('degradationWarning').style.display = 'block';
            }
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
