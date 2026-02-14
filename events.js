// Event Listeners - CSP Compliant (No inline event handlers)
// Attach all DOM event listeners on page load

document.addEventListener('DOMContentLoaded', function() {
    // Language Switcher
    const languageSwitcher = document.getElementById('langSelector');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => switchLanguage(e.target.value));
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
    
    // Chat Buttons
    document.querySelectorAll('.logout').forEach(btn => {
        if (btn.textContent.includes('Telegram')) {
            btn.addEventListener('click', openTelegramModal);
        } else if (btn.textContent.includes('Sign Out')) {
            btn.addEventListener('click', logout);
        }
    });
    
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
