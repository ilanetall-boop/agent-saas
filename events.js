// Event Listeners - CSP Compliant (No inline event handlers)
// Attach all DOM event listeners on page load

document.addEventListener('DOMContentLoaded', function() {
    // Language Switcher (auth page)
    const languageSwitcher = document.getElementById('langSelector');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => switchLanguage(e.target.value));
    }

    // Language Switcher (chat page)
    const chatLanguageSwitcher = document.getElementById('chatLanguageSwitcher');
    if (chatLanguageSwitcher) {
        // Sync with current language
        const currentLang = localStorage.getItem('language') || 'en';
        chatLanguageSwitcher.value = currentLang;

        chatLanguageSwitcher.addEventListener('change', (e) => {
            if (typeof switchLanguage === 'function') {
                switchLanguage(e.target.value);
            } else if (typeof i18nInstance !== 'undefined') {
                i18nInstance.setLanguage(e.target.value);
            }
        });
    }

    // Also sync the main language switcher on page load
    const mainLangSwitcher = document.getElementById('languageSwitcher');
    if (mainLangSwitcher) {
        const currentLang = localStorage.getItem('language') || 'en';
        mainLangSwitcher.value = currentLang;
        mainLangSwitcher.addEventListener('change', (e) => {
            if (typeof switchLanguage === 'function') {
                switchLanguage(e.target.value);
            } else if (typeof i18nInstance !== 'undefined') {
                i18nInstance.setLanguage(e.target.value);
            }
            // Sync chat switcher if visible
            if (chatLanguageSwitcher) {
                chatLanguageSwitcher.value = e.target.value;
            }
        });
    }
    
    // "Start free" buttons - Show signup modal instead of redirecting to /app.html
    document.querySelectorAll('#topStartBtn, #heroStartBtn, .startBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showRegister();
        });
    });
    
    // Login Form
    const loginBtn = document.querySelector('button[data-i18n="auth.sign_in"]');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    // Register Form
    const registerBtn = document.querySelector('button[data-i18n="auth.create_agent"]');
    if (registerBtn) {
        registerBtn.addEventListener('click', register);
    }
    
    // OAuth Buttons (Login)
    document.querySelectorAll('#loginForm .oauth-btn').forEach((btn, idx) => {
        if (idx === 0) btn.addEventListener('click', loginGoogle);
        if (idx === 1) btn.addEventListener('click', loginGithub);
    });
    
    // OAuth Buttons (Register)
    document.querySelectorAll('#registerForm .oauth-btn').forEach((btn, idx) => {
        if (idx === 0) btn.addEventListener('click', loginGoogle);
        if (idx === 1) btn.addEventListener('click', loginGithub);
    });
    
    // Auth switches
    document.querySelectorAll('#loginForm a').forEach(link => {
        link.addEventListener('click', showRegister);
    });
    
    document.querySelectorAll('#registerForm a').forEach(link => {
        link.addEventListener('click', showLogin);
    });
    
    // Chat Interface
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', handleKeyDown);
    }
    
    // Chat Buttons - Use IDs instead of text content (i18n changes text)
    const telegramBtn = document.getElementById('telegramBtn');
    if (telegramBtn) {
        telegramBtn.addEventListener('click', openTelegramModal);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Connections Button
    const connectionsBtn = document.getElementById('connectionsBtn');
    if (connectionsBtn) {
        connectionsBtn.addEventListener('click', openConnectionsModal);
    }

    // Connections Modal Close
    const closeConnectionsBtn = document.getElementById('closeConnectionsModal');
    if (closeConnectionsBtn) {
        closeConnectionsBtn.addEventListener('click', closeConnectionsModal);
    }

    // Close connections modal on outside click
    const connectionsModal = document.getElementById('connectionsModal');
    if (connectionsModal) {
        connectionsModal.addEventListener('click', (e) => {
            if (e.target === connectionsModal) {
                closeConnectionsModal();
            }
        });
    }

    // Telegram Modal
    const telegramResendBtn = document.querySelector('#verificationModal .btn-primary');
    if (telegramResendBtn) {
        telegramResendBtn.addEventListener('click', resendVerificationEmail);
    }
    
    const telegramCancelBtns = document.querySelectorAll('.modal-close, #telegramModal .btn-secondary');
    telegramCancelBtns.forEach(btn => {
        btn.addEventListener('click', closeTelegramModal);
    });
    
    const telegramConnectBtn = document.querySelector('#telegramModal .btn-primary:last-of-type');
    if (telegramConnectBtn) {
        telegramConnectBtn.addEventListener('click', linkTelegramBot);
    }
});
