// OAuth Callback Handler - CSP Compliant (External Script)

async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const provider = window.location.pathname.split('/')[1]; // oauth_google or oauth_github
    
    // Determine provider
    let oauthProvider = 'google';
    if (provider.includes('github') || window.location.search.includes('github')) {
        oauthProvider = 'github';
    }
    
    if (error) {
        showError(`${oauthProvider} login cancelled or denied.`);
        return;
    }
    
    if (!code) {
        showError('No authentication code received. Please try again.');
        return;
    }
    
    try {
        // Exchange code for JWT token
        const endpoint = `/api/oauth/${oauthProvider}/callback`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (response.ok && data.accessToken) {
            // Save token and redirect to dashboard
            localStorage.setItem('accessToken', data.accessToken);
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/app.html';
            }, 500);
        } else {
            showError(data.error || 'Authentication failed. Please try again.');
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        showError('Connection error. Please check your internet and try again.');
    }
}

function showError(message) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('title').textContent = 'Authentication Failed';
    document.getElementById('message').textContent = 'An error occurred during login.';
    
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    document.getElementById('retryButton').style.display = 'block';
}

// Attach event listener for retry button
document.addEventListener('DOMContentLoaded', () => {
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    // Handle callback when page loads
    handleOAuthCallback();
});
