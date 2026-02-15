// Email Verification Handler - CSP Compliant (External Script)

async function verifyEmail() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
        showError('No verification token provided. Please check your email link.');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('✅ Email verified successfully!', 'Your email has been verified. You can now access all features.');
            setTimeout(() => {
                window.location.href = '/app.html';
            }, 2000);
        } else {
            showError(data.error || 'Verification failed. Please try again or contact support.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('Connection error. Please check your internet and try again.');
    }
}

function showSuccess(title, message) {
    document.getElementById('icon').textContent = '✅';
    document.getElementById('title').textContent = title;
    document.getElementById('message').textContent = message;
    document.getElementById('spinner').style.display = 'none';
    
    const status = document.getElementById('status');
    status.className = 'status success';
    status.textContent = 'Verification successful!';
    
    const button = document.getElementById('button');
    button.style.display = 'inline-block';
    button.textContent = 'Go to Dashboard';
    button.addEventListener('click', () => {
        window.location.href = '/app.html';
    });
}

function showError(message) {
    document.getElementById('icon').textContent = '❌';
    document.getElementById('title').textContent = 'Verification Failed';
    document.getElementById('message').textContent = message;
    document.getElementById('spinner').style.display = 'none';
    
    const status = document.getElementById('status');
    status.className = 'status error';
    status.textContent = 'Please try again or contact support';
    
    document.getElementById('divider').style.display = 'block';
    document.getElementById('backButton').style.display = 'inline-block';
}

// Start verification when page loads
document.addEventListener('DOMContentLoaded', verifyEmail);
