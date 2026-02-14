# Frontend Integration Guide

Complete guide for integrating authentication, payments, and OAuth into the My Best Agent frontend.

## 📋 Overview

### Pages Added
| Page | Route | Purpose |
|------|-------|---------|
| verify.html | `/verify?token=XXX` | Email verification page |
| oauth-callback.html | `/oauth-callback.html` | OAuth redirect handler |
| checkout-success.html | `/checkout/success` | Payment success page |
| checkout-cancel.html | `/checkout/cancel` | Payment cancellation page |
| settings.html | `/settings` | User account & subscription management |

### Flows to Implement

#### 1️⃣ **Signup Flow**
```
User fills signup form
↓
POST /api/auth/register (email, password, name)
↓
Get JWT token
↓
Redirect to email verification or dashboard
```

#### 2️⃣ **Email Verification Flow**
```
User receives email with link: /verify?token=ABC123
↓
Click link → Page loads verify.html
↓
POST /api/auth/verify-email (token)
↓
Success → Redirect to /app.html
↓
Error → Show error and retry option
```

#### 3️⃣ **Login Flow**
```
User fills login form
↓
POST /api/auth/login (email, password)
↓
Get JWT token
↓
Store in localStorage
↓
Redirect to /app.html
```

#### 4️⃣ **OAuth Flow**
```
User clicks "Login with Google/GitHub"
↓
GET /api/oauth/{provider}/auth
↓
Redirect to provider (Google/GitHub)
↓
User approves
↓
Provider redirects to oauth-callback.html?code=XXX
↓
POST /api/oauth/{provider}/callback (code)
↓
Get JWT token
↓
Store in localStorage
↓
Redirect to /app.html
```

#### 5️⃣ **Payment/Upgrade Flow**
```
User clicks "Upgrade" button
↓
GET user tier from /api/payments/subscription
↓
POST /api/payments/checkout (tier: "pro")
↓
Get Stripe checkout session URL
↓
Redirect to Stripe Checkout
↓
User completes payment
↓
Stripe redirects to checkout-success.html
↓
Page shows success and offer to go to dashboard
```

---

## 🛠️ Implementation Steps

### Step 1: Add Signup Form

In your signup page (create `/signup.html` or update `/index.html`):

```html
<form id="signupForm">
    <input type="text" id="name" placeholder="Full Name" required>
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Password" required>
    <button type="submit">Sign Up</button>
    
    <p>Or sign up with:</p>
    <button type="button" onclick="loginWithGoogle()">Google</button>
    <button type="button" onclick="loginWithGitHub()">GitHub</button>
</form>

<script>
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Show verification message or redirect
            alert('Verification email sent! Check your inbox.');
            window.location.href = '/app.html';
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Connection error. Please try again.');
    }
}

document.getElementById('signupForm').addEventListener('submit', handleSignup);

function loginWithGoogle() {
    fetch('/api/oauth/google/auth')
        .then(r => r.json())
        .then(data => window.location.href = data.url)
        .catch(() => alert('Failed to initiate Google login'));
}

function loginWithGitHub() {
    fetch('/api/oauth/github/auth')
        .then(r => r.json())
        .then(data => window.location.href = data.url)
        .catch(() => alert('Failed to initiate GitHub login'));
}
</script>
```

### Step 2: Add Login Form

In your login page (create `/login.html` or update `/index.html`):

```html
<form id="loginForm">
    <input type="email" id="loginEmail" placeholder="Email" required>
    <input type="password" id="loginPassword" placeholder="Password" required>
    <button type="submit">Log In</button>
    
    <p>Or log in with:</p>
    <button type="button" onclick="loginWithGoogle()">Google</button>
    <button type="button" onclick="loginWithGitHub()">GitHub</button>
</form>

<script>
async function handleLogin(e) {
    e.preventDefault();
    
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
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Please try again.');
    }
}

document.getElementById('loginForm').addEventListener('submit', handleLogin);
</script>
```

### Step 3: Add Upgrade Button

In your pricing/dashboard page (`/index.html` or `/app.html`):

```html
<button onclick="upgradeTier('pro')" class="upgrade-button">Upgrade to Pro</button>
<button onclick="upgradeTier('enterprise')" class="upgrade-button">Upgrade to Enterprise</button>

<script>
async function upgradeTier(tier) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch('/api/payments/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier })
        });
        
        const data = await response.json();
        
        if (response.ok && data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else {
            alert(data.error || 'Failed to create checkout session');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Connection error. Please try again.');
    }
}
</script>
```

### Step 4: Protect Dashboard

In your dashboard page (`/app.html`):

```javascript
async function protectPage() {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    // Verify token is valid
    try {
        const response = await fetch('/api/auth/verify-token', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            localStorage.removeItem('accessToken');
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();
        
        // Show user info
        document.getElementById('userName').textContent = data.user.name;
        document.getElementById('userEmail').textContent = data.user.email;
        
        // Load subscription status
        await loadSubscription();
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('accessToken');
        window.location.href = '/login.html';
    }
}

async function loadSubscription() {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/api/payments/subscription', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const sub = data.subscription;
            
            document.getElementById('tierBadge').textContent = sub.tier.toUpperCase();
            document.getElementById('messageCount').textContent = `${sub.messagesUsed}/${sub.messagesLimit}`;
            
            // Show/hide upgrade button based on tier
            if (sub.tier === 'free') {
                document.getElementById('upgradeButton').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
}

// Run on page load
window.addEventListener('load', protectPage);
```

### Step 5: Add Logout

```html
<button onclick="logout()">Log Out</button>

<script>
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/';
}
</script>
```

---

## 🔐 Token Management

### Storing Tokens

```javascript
// After login/register
localStorage.setItem('accessToken', data.accessToken);

// Optional: Store user info for quick access
localStorage.setItem('user', JSON.stringify(data.user));
```

### Using Tokens in API Calls

```javascript
const token = localStorage.getItem('accessToken');

fetch('/api/protected-endpoint', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
```

### Token Expiration

Access tokens expire in 30 minutes. Implement refresh logic:

```javascript
async function refreshToken() {
    try {
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            return true;
        } else {
            // Redirect to login
            localStorage.removeItem('accessToken');
            window.location.href = '/login.html';
            return false;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}
```

---

## 🌍 OAuth Configuration in Frontend

### Google

```javascript
function loginWithGoogle() {
    fetch('/api/oauth/google/auth')
        .then(r => r.json())
        .then(data => {
            if (data.url) {
                window.location.href = data.url;
            }
        })
        .catch(error => {
            console.error('OAuth error:', error);
            alert('Failed to initiate Google login');
        });
}
```

### GitHub

```javascript
function loginWithGitHub() {
    fetch('/api/oauth/github/auth')
        .then(r => r.json())
        .then(data => {
            if (data.url) {
                window.location.href = data.url;
            }
        })
        .catch(error => {
            console.error('OAuth error:', error);
            alert('Failed to initiate GitHub login');
        });
}
```

---

## 📊 API Endpoints Reference

### Auth

```bash
# Register
POST /api/auth/register
{ email, password, name }
→ { accessToken, user, agent, message }

# Login
POST /api/auth/login
{ email, password }
→ { accessToken, user }

# Verify email token
POST /api/auth/verify-email
{ token }
→ { success: true }

# Verify access token (check if valid)
GET /api/auth/verify-token
Authorization: Bearer token
→ { valid: true, user }

# Refresh access token
POST /api/auth/refresh-token
→ { accessToken, expiresIn }
```

### Payments

```bash
# Create checkout session
POST /api/payments/checkout
Authorization: Bearer token
{ tier: "pro" }
→ { sessionId, url }

# Get checkout session status
GET /api/payments/checkout/:sessionId
Authorization: Bearer token
→ { status, tier, subscriptionId }

# Get subscription info
GET /api/payments/subscription
Authorization: Bearer token
→ { subscription: { tier, status, nextBillingDate, ... } }

# Cancel subscription
POST /api/payments/subscription/cancel
Authorization: Bearer token
→ { success: true, newTier: "free" }
```

### OAuth

```bash
# Get Google OAuth URL
GET /api/oauth/google/auth
→ { url: "https://accounts.google.com/..." }

# Google callback
POST /api/oauth/google/callback
{ code }
→ { accessToken, user }

# Get GitHub OAuth URL
GET /api/oauth/github/auth
→ { url: "https://github.com/login/oauth/..." }

# GitHub callback
POST /api/oauth/github/callback
{ code }
→ { accessToken, user }

# Unlink OAuth
POST /api/oauth/unlink
Authorization: Bearer token
{ provider: "google" | "github" }
→ { success: true, message: "..." }
```

---

## 🧪 Testing

### Test Account (Email)
- Email: `test@example.com`
- Password: `Test123!@#`

### Test Stripe Card
- Number: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `567`

### Test OAuth
- Google: Use personal Google account
- GitHub: Use personal GitHub account

---

## ⚠️ Important Notes

1. **HTTPS Only**: OAuth requires HTTPS in production
2. **CORS**: Backend must allow frontend domain (already configured)
3. **Token Storage**: Consider security implications of localStorage
4. **Email Configuration**: Backend requires RESEND_API_KEY for email sending
5. **Stripe Keys**: Use test keys in development, live keys in production
6. **OAuth Keys**: Must be configured in .env on backend

---

## 📋 Checklist

- [ ] Signup form added to index.html
- [ ] Login form added to index.html or separate login.html
- [ ] Upgrade buttons added to pricing section
- [ ] Token protection on /app.html
- [ ] Logout button implemented
- [ ] OAuth buttons (Google, GitHub) added
- [ ] Settings page (/settings) integrated
- [ ] Email verification flow tested
- [ ] Payment flow tested with test card
- [ ] OAuth flows tested
- [ ] Redirect URLs configured in Google/GitHub apps
- [ ] Backend environment variables set
- [ ] CORS headers verified in browser console

---

## 🚀 Deployment

1. **Before deploying:**
   - Set RESEND_API_KEY on Render
   - Set Stripe keys (test or live)
   - Set Google OAuth credentials
   - Set GitHub OAuth credentials
   - Update OAuth redirect URIs to production domain

2. **Test in production:**
   - Register → Verify email → Login
   - Login with Google
   - Login with GitHub
   - Upgrade to paid tier
   - View subscription status
   - Cancel subscription

3. **Monitor:**
   - Check logs for auth errors
   - Monitor payment webhook deliveries in Stripe dashboard
   - Monitor OAuth errors in browser console

---

## 🆘 Troubleshooting

### "Email verification failed"
- Check RESEND_API_KEY is set in backend
- Check email address is correct
- Verify token in URL matches database

### "Payment failed"
- Check Stripe keys are set correctly
- Verify webhook URL in Stripe dashboard
- Check browser console for errors

### "OAuth failed"
- Verify redirect URI matches in provider settings
- Check client ID and secret are correct
- Verify domain is HTTPS in production

---

**Status**: Frontend pages ready, integration code samples provided. Build your signup/login/dashboard UI using these examples!
