# My Best Agent - Setup Guide

Complete setup instructions for deploying Agent-SaaS V1 with email, payments, and OAuth.

## Prerequisites Completed ✅

These features are now implemented and ready:
- [x] User registration & login (JWT dual-token auth)
- [x] Email verification (Resend API)
- [x] Payment processing (Stripe)
- [x] OAuth login (Google + GitHub)
- [x] Subscription management (3 tiers)
- [x] AI routing (smart model selection)
- [x] Multi-language support (11 languages)

---

## 1️⃣ Email Configuration (Resend)

### Setup Steps

1. **Create Resend Account**
   - Go to https://resend.com/
   - Sign up with email
   - Verify email

2. **Get API Key**
   - Navigate to "API Keys" section
   - Create new API key
   - Copy the key (format: `re_...`)

3. **Configure Environment**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=onboarding@mybestagent.io
   FRONTEND_URL=https://mybestagent.io
   ```

4. **Verify Email Template**
   - Check that emails are being sent when users register
   - Test with: `POST /api/auth/register`
   - Verify email arrives within 30 seconds

### Testing Email
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

---

## 2️⃣ Payment Configuration (Stripe)

### Setup Steps

1. **Create Stripe Account**
   - Go to https://stripe.com/
   - Sign up
   - Verify email

2. **Get API Keys**
   - Go to Dashboard → API Keys
   - Copy "Secret Key" (format: `sk_test_...`)
   - Copy "Publishable Key" (format: `pk_test_...`)

3. **Create Products & Prices**

   **Product 1: Pro**
   - Name: "My Best Agent Pro"
   - Pricing: €19.00/month (recurring)
   - Get Price ID (format: `price_...`)

   **Product 2: Enterprise**
   - Name: "My Best Agent Enterprise"
   - Pricing: €49.00/month (recurring)
   - Get Price ID

   **Product 3: VIP**
   - Name: "My Best Agent VIP"
   - Pricing: €99.00/month (recurring)
   - Get Price ID

4. **Setup Webhook**
   - Go to Developers → Webhooks
   - Add endpoint: `https://mybestagent.io/api/payments/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook signing secret (format: `whsec_...`)

5. **Configure Environment**
   ```bash
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_VIP=price_xxxxxxxxxxxxx
   ```

### Testing Payments
```bash
# Initiate checkout
curl -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'

# Response includes checkout URL
# Visit URL and use Stripe test card: 4242 4242 4242 4242
```

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expired: `4000 0000 0000 0069` (use 12/34 expiry)

---

## 3️⃣ OAuth Configuration (Google)

### Setup Steps

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create new project: "MyBestAgent"
   - Wait for project creation

2. **Enable OAuth Consent Screen**
   - Go to APIs & Services → OAuth consent screen
   - Select "External" (for testing)
   - Fill in app info:
     - App name: "My Best Agent"
     - User support email: your email
     - Developer contact: your email

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client IDs
   - Type: Web application
   - Authorized redirect URIs:
     - `https://mybestagent.io/api/oauth/google/callback`
     - `http://localhost:3000/api/oauth/google/callback` (dev)
   - Get Client ID and Client Secret

4. **Configure Environment**
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX_xxxxxxxxxxxxx
   GOOGLE_OAUTH_REDIRECT_URI=https://mybestagent.io/api/oauth/google/callback
   ```

### Testing Google OAuth
```bash
# Get auth URL
curl http://localhost:3000/api/oauth/google/auth

# Visit returned URL, complete login
# Google redirects to callback with code
# Frontend exchanges code for JWT token
```

---

## 4️⃣ OAuth Configuration (GitHub)

### Setup Steps

1. **Create GitHub App**
   - Go to https://github.com/settings/apps
   - Create New GitHub App
   - Fill in:
     - App name: "MyBestAgent"
     - Homepage URL: `https://mybestagent.io`
     - Callback URL: `https://mybestagent.io/api/oauth/github/callback`
     - Request user authorization: enabled

2. **Configure Permissions**
   - Account permissions:
     - Email addresses: Read-only
     - Profile: Read-only

3. **Get Credentials**
   - Copy Client ID
   - Generate Client Secret
   - Copy both

4. **Configure Environment**
   ```bash
   GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
   GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
   GITHUB_OAUTH_REDIRECT_URI=https://mybestagent.io/api/oauth/github/callback
   ```

### Testing GitHub OAuth
```bash
# Get auth URL
curl http://localhost:3000/api/oauth/github/auth

# Visit returned URL, complete login
# GitHub redirects to callback with code
# Frontend exchanges code for JWT token
```

---

## 5️⃣ Deploy to Production

### Step 1: Update Environment Variables on Render

```bash
# SSH into Render dashboard or set via UI:

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@mybestagent.io
FRONTEND_URL=https://mybestagent.io

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
STRIPE_PRICE_VIP=price_...

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://mybestagent.io/api/oauth/google/callback

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_REDIRECT_URI=https://mybestagent.io/api/oauth/github/callback
```

### Step 2: Deploy
```bash
git push origin main
# Render auto-deploys
# Migrations run on startup
```

### Step 3: Verify Deployment
```bash
# Test API health
curl https://mybestagent.io/api/health

# Test email
curl -X POST https://mybestagent.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!@#", "name": "Test"}'

# Check inbox for verification email
```

---

## 6️⃣ Frontend Integration Required

The backend is ready. Frontend needs:

### Pages to Create
1. **Signup Page**
   - Email, password, name fields
   - "Login with Google" button
   - "Login with GitHub" button
   - Link to privacy policy

2. **Verification Page** (`/verify?token=xxx`)
   - Show "Verifying email..."
   - Call `/api/auth/verify-email` with token
   - Redirect to dashboard on success

3. **Login Page**
   - Email, password fields
   - "Login with Google" button
   - "Login with GitHub" button
   - Refresh token handling

4. **Upgrade Page**
   - Show 3 tiers (Pro/Enterprise/VIP)
   - Redirect to Stripe on click
   - Handle `/checkout/success` and `/checkout/cancel`

5. **Subscription Page** (`/settings/subscription`)
   - Show current tier
   - Show next billing date
   - Show "Cancel" button
   - Show OAuth links

### API Calls Reference

**Register**
```javascript
POST /api/auth/register
{email, password, name}
→ {accessToken, user, agent}
```

**Login**
```javascript
POST /api/auth/login
{email, password}
→ {accessToken, user}
```

**Verify Email**
```javascript
POST /api/auth/verify-email
{token}
→ {success: true}
```

**Verify Token** (check if valid)
```javascript
GET /api/auth/verify-token
(requires Authorization header)
→ {valid: true, user}
```

**Create Checkout**
```javascript
POST /api/payments/checkout
{tier: "pro"}
→ {sessionId, url}
// Redirect to url
```

**Get Subscription**
```javascript
GET /api/payments/subscription
→ {subscription: {tier, status, nextBillingDate}}
```

**Cancel Subscription**
```javascript
POST /api/payments/subscription/cancel
→ {success: true, newTier: "free"}
```

**Google OAuth**
```javascript
GET /api/oauth/google/auth
→ {url: "https://accounts.google.com/o/oauth2/..."}
// Redirect to url, user login, callback to:
POST /api/oauth/google/callback
{code} or {idToken}
→ {accessToken, user}
```

**GitHub OAuth**
```javascript
GET /api/oauth/github/auth
→ {url: "https://github.com/login/oauth/..."}
// Redirect to url, user login, callback to:
POST /api/oauth/github/callback
{code}
→ {accessToken, user}
```

---

## 7️⃣ Testing Checklist

- [ ] User can register with email/password
- [ ] Verification email arrives
- [ ] User can click verification link
- [ ] User can login with email/password
- [ ] User can login with Google
- [ ] User can login with GitHub
- [ ] User can upgrade to Pro
- [ ] Stripe webhook processes payment
- [ ] User tier updated to Pro
- [ ] User can view subscription status
- [ ] User can cancel subscription
- [ ] User tier downgraded to free
- [ ] OAuth account can be unlinked
- [ ] New password required to unlink

---

## 🎯 Summary

**Backend:** ✅ Complete and tested
**Frontend:** ⏳ Needs UI/UX implementation
**External Services:** ⏳ Requires configuration keys

**Next Steps:**
1. Set up Stripe, Google, GitHub accounts
2. Get API keys
3. Add to Render environment variables
4. Build frontend pages
5. User testing
6. Launch 🚀

---

## Support Commands

```bash
# Test email service
npm run dev
# POST http://localhost:3000/api/auth/register

# Test Stripe API
# Use Stripe test keys + cards

# Test OAuth
# Use dev redirect URIs

# View logs
# On Render: Logs tab
```

---

**Status:** Backend MVP ready for deployment! 🚀
