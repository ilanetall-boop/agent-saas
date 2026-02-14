// Auth Modal Functions - CSP Compliant
// DEFINE ALL FUNCTIONS FIRST, then attach event listeners

// ===== MODAL SHOW/HIDE =====
window.showLogin = function() {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (modal) modal.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
};

window.showRegister = function() {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (modal) modal.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
};

window.closeModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
};

// Backward compatibility
window.closeAuthModal = window.closeModal;

// ===== FORM HANDLERS =====
window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/app.html';
        } else {
            alert('Erreur: ' + (data.error || 'Connexion échouée'));
        }
    } catch (error) {
        alert('Erreur réseau: ' + error.message);
    }
};

window.handleSignup = async function(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    console.log('📝 Signup attempt:', { email, name });
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('🔄 Register response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Register response data:', data);
        
        if (response.ok) {
            console.log('✅ Registration successful, storing token and redirecting...');
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('✅ Token stored, redirecting to /app.html');
            setTimeout(() => {
                window.location.href = '/app.html';
            }, 500);
        } else {
            console.error('❌ Registration failed:', data.error);
            alert('Erreur: ' + (data.error || 'Création de compte échouée'));
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        alert('Erreur réseau: ' + error.message);
    }
};

// ===== OAUTH HANDLERS =====
window.loginWithGoogle = async function() {
    try {
        const response = await fetch('/api/oauth/google/auth');
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        alert('Erreur: ' + (error.message || 'Google login échoué'));
    }
};

window.signupWithGoogle = function() {
    window.loginWithGoogle();
};

window.loginWithGitHub = async function() {
    try {
        const response = await fetch('/api/oauth/github/auth');
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        alert('Erreur: ' + (error.message || 'GitHub login échoué'));
    }
};

window.signupWithGitHub = function() {
    window.loginWithGitHub();
};

// ===== MODAL SWITCHES =====
window.switchToSignup = function(event) {
    if (event) event.preventDefault();
    window.showRegister();
};

window.switchToLogin = function(event) {
    if (event) event.preventDefault();
    window.showLogin();
};

// ===== PASSWORD VISIBILITY TOGGLE =====
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const btn = event.target.closest('.password-toggle');
    if (!input || !btn) return;
    
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '👁️‍🗨️' : '👁️';
};

// ===== ATTACH EVENT LISTENERS (after all functions are defined) =====
document.addEventListener('DOMContentLoaded', function() {
    // Modal close button (by ID to avoid conflicts)
    const closeBtn = document.getElementById('authModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeModal);
    }
    
    // Close modal when clicking outside (on overlay)
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeModal();
            }
        });
    }
    
    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const inputId = btn.getAttribute('data-toggle-for');
            window.togglePasswordVisibility(inputId);
        });
    });
    
    // Language Switcher
    const langSelector = document.getElementById('langSelector');
    if (langSelector && typeof switchLanguage !== 'undefined') {
        langSelector.addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
    }
    
    // "Start free" buttons - Show signup modal
    document.querySelectorAll('#topStartBtn, #heroStartBtn, .startBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.showRegister();
        });
    });
    
    // Form submissions
    const loginFormEl = document.getElementById('loginFormElement');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', window.handleLogin);
    }
    
    const signupFormEl = document.getElementById('signupFormElement');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', window.handleSignup);
    }
    
    // OAuth buttons
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', window.loginWithGoogle);
    }
    
    const loginGitHubBtn = document.getElementById('loginGitHubBtn');
    if (loginGitHubBtn) {
        loginGitHubBtn.addEventListener('click', window.loginWithGitHub);
    }
    
    const signupGoogleBtn = document.getElementById('signupGoogleBtn');
    if (signupGoogleBtn) {
        signupGoogleBtn.addEventListener('click', window.loginWithGoogle);
    }
    
    const signupGitHubBtn = document.getElementById('signupGitHubBtn');
    if (signupGitHubBtn) {
        signupGitHubBtn.addEventListener('click', window.loginWithGitHub);
    }
    
    // Modal switches
    const switchToSignupLink = document.getElementById('switchToSignupLink');
    if (switchToSignupLink) {
        switchToSignupLink.addEventListener('click', window.switchToSignup);
    }
    
    const switchToLoginLink = document.getElementById('switchToLoginLink');
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', window.switchToLogin);
    }
});
