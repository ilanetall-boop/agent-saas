// Checkout Success Handler - CSP Compliant (External Script)

async function loadSubscriptionInfo() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        // If not logged in, show basic success message
        return;
    }
    
    try {
        const response = await fetch('/api/payments/subscription', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const sub = data.subscription;
            
            document.getElementById('tier').textContent = 
                sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1);
            
            if (sub.nextBillingDate) {
                const date = new Date(sub.nextBillingDate);
                document.getElementById('nextBilling').textContent = 
                    date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
            }
        }
    } catch (error) {
        console.error('Failed to load subscription info:', error);
    }
}

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    const dashboardButton = document.getElementById('dashboardButton');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', () => {
            window.location.href = '/app.html';
        });
    }
    
    loadSubscriptionInfo();
});
