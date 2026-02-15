# My Best Agent - Deployment Guide

Complete setup guide for **Onboarding**, **Telegram Bot**, and **Desktop App**.

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Telegram Bot Token (from @BotFather)
- Backend API running (see `src/api/server.js`)
- Environment variables configured

---

## 🔧 Environment Variables

Create `.env` in root directory:

```env
# Backend
NODE_ENV=production
PORT=5000
API_URL=https://api.mybestagent.io
APP_URL=https://mybestagent.io

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mybestagent_db

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://mybestagent.io

# OAuth (Google, GitHub, etc.)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security
JWT_SECRET=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Sentry (Error Tracking)
SENTRY_DSN=https://your_sentry_dsn

# File Storage (S3 or equivalent)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=mybestagent-files

# Claude API
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## 1. 🎨 Onboarding Screen

**File:** `onboarding.html`

### Features
- 3 clickable cards: Desktop, Telegram, WhatsApp
- Matches design system (mauve #635bff, Inter font)
- 100% responsive (mobile first)
- User preference tracking (localStorage)

### Deploy
```bash
# No build required - it's standalone HTML
# Serves at: https://mybestagent.io/onboarding
```

### Route Handler
```javascript
// In server.js
app.get('/onboarding', (req, res) => {
    res.sendFile(path.join(__dirname, '../../onboarding.html'));
});
```

---

## 2. 🤖 Telegram Bot

**Files:** `src/api/routes/telegram.js`

### Features
- Webhook endpoint: `POST /api/telegram/webhook`
- Commands: `/start`, `/help`, `/create`, `/image`, `/code`, `/video`
- User authentication (link Telegram ID to account)
- Inline buttons for actions
- File uploads & downloads

### Setup

#### 1. Create Telegram Bot
```bash
# Chat with @BotFather on Telegram
/newbot
# Name: My Best Agent
# Username: @mybestagent_bot
# Get: TELEGRAM_BOT_TOKEN
```

#### 2. Set Webhook
```bash
# In production, the webhook is auto-set on startup
# Or manually:
curl -X POST https://api.telegram.org/botYOUR_TOKEN/setWebhook \
  -d "url=https://mybestagent.io/api/telegram/webhook"
```

#### 3. Authentication Flow
1. User sends `/start` to bot
2. Bot shows login button (OAuth)
3. User logs in via web
4. User clicks "Connect Telegram"
5. Session stored: `telegram_id → account`

### API Endpoints
```
POST /api/telegram/webhook     - Handle messages
GET  /api/telegram/auth/:token - Authenticate user
POST /api/telegram/send        - Send message from backend
```

### User Session Format
```javascript
{
    telegram_id: 123456789,
    account_id: "user_uuid",
    token: "auth_token",
    name: "John Doe",
    created_at: "2024-02-15T..."
}
```

### Testing
```bash
# Send test message
curl -X POST https://mybestagent.io/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": { "id": 123456789 },
      "from": { "id": 987654321, "first_name": "Test" },
      "text": "Hello agent"
    }
  }'
```

---

## 3. 💻 Electron Desktop App

**Files:** `electron/main.js`, `preload.js`, `app.html`, `app.js`, `styles.css`, `package.json`

### Features
- Chat interface (like web app)
- File read/write operations (any directory)
- Execute commands on local machine
- Clipboard access
- Open URLs & files
- System info retrieval
- Auto-update checking
- Dark mode support

### Setup

#### 1. Install Dependencies
```bash
cd electron
npm install
```

#### 2. Run in Development
```bash
npm run dev
# Opens electron with hot reload
```

#### 3. Build for Distribution

**macOS:**
```bash
npm run build:mac
# Creates: electron/dist/MyBestAgent-x.x.x.dmg
```

**Windows:**
```bash
npm run build:win
# Creates: electron/dist/MyBestAgent Setup x.x.x.exe
```

**Linux:**
```bash
npm run build:linux
# Creates: electron/dist/MyBestAgent-x.x.x.AppImage
```

#### 4. Auto-Update
App checks for updates at startup:
```
GET /api/app/latest-version
→ { version: "1.0.1", downloadUrl: "..." }
```

### API Bridge (window.api)

```javascript
// Files
await window.api.files.read('/path/to/file')
await window.api.files.write('/path/to/file', 'content')
await window.api.files.list('/path/to/dir')
await window.api.files.delete('/path/to/file')

// Execution
await window.api.exec.run('node script.js')
await window.api.exec.open('/path/to/file')
await window.api.exec.openUrl('https://example.com')

// System
await window.api.system.home()      // → /Users/john
await window.api.system.desktop()   // → /Users/john/Desktop
await window.api.system.getInfo()   // → { os, arch, version, ... }

// Clipboard
await window.api.clipboard.read()   // → clipboard content
await window.api.clipboard.write('text')

// Backend
await window.api.api.call('POST', '/api/agent/chat', { message: '...' }, token)

// Updates
await window.api.app.checkUpdates() // → { hasUpdate, latestVersion, downloadUrl }
```

### Trusted Mode

After first login, users grant permission once for:
- ✅ File access (read/write)
- ✅ Command execution
- ✅ URL opening
- ✅ Clipboard access

No more dialogs after that!

### Security Considerations

1. **Context Isolation:** Enabled (`contextIsolation: true`)
2. **Preload Bridge:** Only explicit APIs exposed via `contextBridge`
3. **Sandbox:** Renderer process runs in sandbox
4. **HTTPS Only:** Backend communication over HTTPS
5. **Token-based Auth:** JWT tokens for API requests
6. **Local Storage:** Auth tokens stored in Electron's secure storage

---

## 🚀 Deployment Checklist

### 1. Backend Setup
- [ ] Install dependencies: `npm install`
- [ ] Configure `.env` file
- [ ] Setup database (PostgreSQL)
- [ ] Run migrations
- [ ] Start server: `npm start`
- [ ] Verify health: `GET /api/health`

### 2. Telegram Bot
- [ ] Create bot via @BotFather
- [ ] Set `TELEGRAM_BOT_TOKEN` in `.env`
- [ ] Register webhook: `POST /api/telegram/webhook`
- [ ] Test: Send `/start` to bot
- [ ] Verify user authentication flow

### 3. Desktop App
- [ ] Build for all platforms (macOS, Windows, Linux)
- [ ] Test locally with `npm run dev`
- [ ] Upload binaries to CDN or GitHub Releases
- [ ] Update version in `package.json`
- [ ] Test auto-update mechanism

### 4. Onboarding
- [ ] Verify onboarding.html loads at `/onboarding`
- [ ] Test all 3 card links work
- [ ] Test responsive design on mobile
- [ ] Verify localStorage preference tracking

### 5. Production Verification
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting in place
- [ ] Error tracking (Sentry) enabled
- [ ] Monitoring & logging setup
- [ ] Backups scheduled

---

## 📦 Release Process

### Desktop App Release
```bash
# 1. Update version
npm version patch  # 1.0.0 → 1.0.1

# 2. Build all platforms
npm run build

# 3. Upload to CDN
# Files in electron/dist/
# - MyBestAgent-1.0.1.dmg (macOS)
# - MyBestAgent Setup 1.0.1.exe (Windows)
# - MyBestAgent-1.0.1.AppImage (Linux)

# 4. Create GitHub Release
# Tag: v1.0.1
# Attach binaries

# 5. Update version endpoint
# GET /api/app/latest-version
# → { "version": "1.0.1", "downloadUrl": "https://..." }
```

### Telegram Bot Update
```bash
# 1. Update src/api/routes/telegram.js
# 2. Restart server
# 3. Test commands work
# 4. No binary build needed
```

### Onboarding Update
```bash
# 1. Update onboarding.html
# 2. Clear CDN cache
# 3. Test at https://mybestagent.io/onboarding
```

---

## 🐛 Troubleshooting

### Telegram Bot Not Responding
```bash
# 1. Check webhook registration
curl https://api.telegram.org/botTOKEN/getWebhookInfo

# 2. Check logs
# 3. Verify TELEGRAM_BOT_TOKEN in .env
# 4. Re-register webhook if needed
```

### Desktop App Auth Failing
```bash
# 1. Check REACT_APP_API_URL in electron/.env
# 2. Verify JWT_SECRET matches backend
# 3. Check token in browser console
# 4. Test backend auth endpoint separately
```

### Onboarding Links Not Working
```bash
# 1. Verify Telegram bot username
# 2. Check WhatsApp number format
# 3. Test desktop download URL: GET /api/download/desktop
# 4. Check CORS on /api/download/desktop
```

### Update Check Failing
```bash
# 1. Verify GET /api/app/latest-version returns JSON
# 2. Check response format: { version, downloadUrl }
# 3. Ensure HTTPS on all URLs
```

---

## 📊 Monitoring

### Key Metrics to Track
- Telegram bot message volume
- Desktop app active sessions
- Auth success/failure rates
- API response times
- File operation errors
- Update check frequency

### Alerts to Setup
- Bot webhook failures
- Desktop app crash reports
- Auth token expiration spikes
- High API error rates
- Storage quota exceeded

---

## 🔐 Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly restricted
- [ ] Rate limiting configured
- [ ] JWT tokens have short expiry (15-30 min)
- [ ] Refresh tokens use httpOnly cookies
- [ ] Passwords hashed (bcrypt)
- [ ] Telegram webhook validated
- [ ] Desktop app code signed (macOS/Windows)
- [ ] Dependencies kept updated
- [ ] Secrets not in version control

---

## 📞 Support

For issues:
1. Check logs: `/var/log/mybestagent/`
2. Test endpoints directly
3. Check GitHub Issues
4. Contact: support@mybestagent.io
