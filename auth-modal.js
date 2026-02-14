// Auth Modal Functions - CSP Compliant
// Handles signup/login modal on landing page (index.html)

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
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
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                window.location.href = '/app.html';
            } else {
                const error = await response.json();
                alert('Erreur: ' + (error.error || 'Connexion échouée'));
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
            
            if (response.ok) {
                alert('Compte créé! Vérifiez votre email.');
                showLogin();
            } else {
                const error = await response.json();
                alert('Erreur: ' + (error.error || 'Création de compte échouée'));
            }
        } catch (error) {
            alert('Erreur réseau: ' + error.message);
        }
    };
    
    // OAuth handlers
    window.loginWithGoogle = function() {
        window.location.href = '/api/oauth/google/auth';
    };
    
    window.signupWithGoogle = function() {
        window.location.href = '/api/oauth/google/auth';
    };
    
    window.loginWithGitHub = function() {
        window.location.href = '/api/oauth/github/auth';
    };
    
    window.signupWithGitHub = function() {
        window.location.href = '/api/oauth/github/auth';
    };
});
