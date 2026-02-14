// Auth Modal Functions - CSP Compliant
// Handles signup/login modal on landing page (index.html)

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
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
            showRegister();
        });
    });
    
    // Form submissions
    const loginFormEl = document.getElementById('loginFormElement');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', handleLogin);
    }
    
    const signupFormEl = document.getElementById('signupFormElement');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', handleSignup);
    }
    
    // OAuth buttons
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', loginWithGoogle);
    }
    
    const loginGitHubBtn = document.getElementById('loginGitHubBtn');
    if (loginGitHubBtn) {
        loginGitHubBtn.addEventListener('click', loginWithGitHub);
    }
    
    const signupGoogleBtn = document.getElementById('signupGoogleBtn');
    if (signupGoogleBtn) {
        signupGoogleBtn.addEventListener('click', loginWithGoogle);
    }
    
    const signupGitHubBtn = document.getElementById('signupGitHubBtn');
    if (signupGitHubBtn) {
        signupGitHubBtn.addEventListener('click', loginWithGitHub);
    }
    
    // Modal switches
    const switchToSignupLink = document.getElementById('switchToSignupLink');
    if (switchToSignupLink) {
        switchToSignupLink.addEventListener('click', switchToSignup);
    }
    
    const switchToLoginLink = document.getElementById('switchToLoginLink');
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', switchToLogin);
    }
    
    // Show/hide auth modal
    window.showLogin = function() {
        if (loginForm) {
            loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
        }
    };
    
    window.showRegister = function() {
        if (signupForm) {
            signupForm.style.display = 'block';
            if (loginForm) loginForm.style.display = 'none';
        }
    };
    
    window.switchToSignup = function(event) {
        event.preventDefault();
        showRegister();
    };
    
    window.switchToLogin = function(event) {
        event.preventDefault();
        showLogin();
    };
    
    // Auth handlers
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
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/app.html';
            } else {
                alert('Erreur: ' + (data.error || 'Création de compte échouée'));
            }
        } catch (error) {
            alert('Erreur réseau: ' + error.message);
        }
    };
    
    // OAuth handlers
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
        loginWithGoogle();
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
        loginWithGitHub();
    };
});
