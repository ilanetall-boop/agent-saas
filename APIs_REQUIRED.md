# APIs & Credentials Required for Full Automation

## Already Have ✅
- `OPENAI_API_KEY` - Text generation + translations
- `ANTHROPIC_API_KEY` - Claude for content
- `SENTRY_DSN` - Error tracking
- `TELEGRAM_BOT_TOKEN` - Telegram bot
- `GITHUB_TOKEN` - (optional, for auto-commits)

---

## Need to Create 🔄

### 1. Google Search Console API
**Purpose:** Auto-submit articles to Google for indexing

**Steps:**
1. Go to https://console.developers.google.com
2. Create/Select project "Agent-SaaS"
3. Enable API: "Google Search Console API"
4. Create Service Account
5. Download JSON key file
6. Give service account access to your domain at https://search.google.com/search-console

**What you'll get:**
- `GOOGLE_SA_EMAIL` (e.g., `agent-saas@project-123.iam.gserviceaccount.com`)
- `GOOGLE_SA_KEY` (JSON content of the key file, or path)

**Environment Variables:**
```
GOOGLE_SA_EMAIL=...
GOOGLE_SA_KEY_FILE=/path/to/service-account-key.json
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://agent-saas.onrender.com
```

---

### 2. Google Analytics 4 (optional, recommended)
**Purpose:** Track article traffic, conversions

**Steps:**
1. Go to https://analytics.google.com
2. Create property for agent-saas.onrender.com
3. Get Measurement ID (G-XXXXXXXXXX)

**What you'll get:**
- `GA4_MEASUREMENT_ID` (e.g., G-ABC123XYZ)

**Environment Variable:**
```
GA4_MEASUREMENT_ID=G-...
```

---

### 3. Stripe API (for later, but list it)
**Purpose:** Payment processing

**Steps:**
1. Go to https://stripe.com
2. Create account
3. Go to Developers → API Keys
4. Copy Publishable Key + Secret Key

**What you'll get:**
- `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- `STRIPE_SECRET_KEY` (sk_live_...)

**Environment Variables:**
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

### 4. Google OAuth (for user authentication)
**Purpose:** Login with Google

**Steps:**
1. Go to https://console.developers.google.com
2. Go to "Credentials"
3. Create "OAuth 2.0 Client ID" → Web Application
4. Authorized redirect URIs: `https://agent-saas.onrender.com/api/auth/google/callback`
5. Copy Client ID + Client Secret

**What you'll get:**
- `GOOGLE_CLIENT_ID` (xxx.apps.googleusercontent.com)
- `GOOGLE_CLIENT_SECRET` (xxx)

**Environment Variables:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

### 5. SendGrid API (optional, for email)
**Purpose:** Email validation + notifications (better than Gmail)

**Steps:**
1. Go to https://sendgrid.com
2. Create free account (100 emails/day)
3. Go to Settings → API Keys
4. Create new API Key (Full Access)

**What you'll get:**
- `SENDGRID_API_KEY` (SG.xxx)

**Environment Variable:**
```
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@agent-saas.onrender.com
```

---

### 6. GitHub API (optional, for auto-commits)
**Purpose:** Auto-commit articles to GitHub repo

**Steps:**
1. Go to https://github.com/settings/tokens
2. Generate new token
3. Scopes: `repo` (full control)

**What you'll get:**
- `GITHUB_TOKEN` (ghp_xxx)

**Environment Variable:**
```
GITHUB_TOKEN=ghp_...
```

---

## Summary: What to Create NOW

**Priority 1 (Essential for SEO automation):**
1. ✅ Google Search Console API (service account)
2. ✅ Google Analytics 4 (measurement ID)

**Priority 2 (For better UX):**
3. ✅ Google OAuth (Client ID + Secret)
4. ✅ SendGrid (email API)

**Priority 3 (Nice to have):**
5. ⏳ GitHub API (if you want auto-commits)
6. ⏳ Stripe (for payments later)

---

## Setup Checklist

- [ ] Google Search Console API + Service Account
- [ ] Google Analytics 4 
- [ ] Google OAuth credentials
- [ ] SendGrid API key
- [ ] Add all to Render Environment Variables
- [ ] Test connections

