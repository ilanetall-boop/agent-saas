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
        addMessage('assistant', "Hey! I'm your new AI agent. What's your name?");
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

function addMessage(role, content, aiInfo = null) {
    const messagesEl = document.getElementById('chatMessages');
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;
    
    let formatted = content
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    // Model indicator for assistant messages
    let modelIndicator = '';
    if (role === 'assistant' && aiInfo && aiInfo.model) {
        const modelName = formatModelName(aiInfo.model);
        const complexityEmoji = getComplexityEmoji(aiInfo.complexity);
        modelIndicator = `<div class="model-indicator">${complexityEmoji} ${modelName}</div>`;
    }

    msgEl.innerHTML = `
        <div class="avatar">${role === 'user' ? '👤' : '⚡'}</div>
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
        'mistral-small-latest': 'Mistral',
        'claude-3-5-haiku-20241022': 'Haiku',
        'claude-3-5-sonnet-20241022': 'Sonnet',
        'claude-opus-4-5': 'Opus',
        'gpt-3.5-turbo': 'GPT-3.5',
        'gpt-4-turbo-preview': 'GPT-4'
    };
    return modelNames[model] || model.split('-').slice(0, 2).join(' ');
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
        <div class="avatar">⚡</div>
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
        const res = await fetch(`${API_URL}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        removeTypingIndicator();

        if (res.ok) {
            const data = await res.json();
            // Pass AI routing info to show model used
            addMessage('assistant', data.response, data.ai || null);
            
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
        addMessage('assistant', `${i18nInstance.t('errors.network_error')}: ${e.message}`);
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
