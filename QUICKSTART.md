# Quick Start Guide - My Best Agent

Get the system running locally in 15 minutes.

---

## ⚡ 5-Minute Backend Setup

### 1. Install & Configure
```bash
# Clone or navigate to project
cd agent-saas

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with local values
nano .env
# Or use your editor: 
# - NODE_ENV=development
# - PORT=5000
# - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mybestagent_dev
# - JWT_SECRET=dev_secret_key_change_in_prod
# - TELEGRAM_BOT_TOKEN=... (get from @BotFather, optional)
```

### 2. Database Setup
```bash
# Make sure PostgreSQL is running
# Create database
createdb mybestagent_dev

# Run migrations (if migrations exist)
npm run migrate
```

### 3. Start Server
```bash
npm start
# Server runs on http://localhost:5000

# Or with auto-reload
npm run dev
```

### 4. Test Backend
```bash
# In another terminal
curl http://localhost:5000/api/health
# Response: {"status":"ok","time":"..."}

curl http://localhost:5000/
# Shows: index.html (landing page)

curl http://localhost:5000/onboarding
# Shows: onboarding.html
```

---

## 💻 10-Minute Desktop App Setup

### 1. Navigate & Install
```bash
cd agent-saas/electron

# Install dependencies
npm install
```

### 2. Run Development
```bash
npm run dev
# Opens Electron window
# Hot reloads on file changes
```

### 3. Test Features
- **Chat:** Type message, see response
- **Files:** Click "Files" tab, browse directories
- **Settings:** View app version, check for updates
- **Drag & Drop:** Drop files into chat window

### 4. Build (Optional)
```bash
# macOS
npm run build:mac

# Windows (requires Windows)
npm run build:win

# Linux
npm run build:linux

# Output in: electron/dist/
```

---

## 🤖 Telegram Bot Setup (5 minutes)

### 1. Create Bot
```bash
# Open Telegram and chat with @BotFather
/newbot
# Name: My Best Agent (or your test name)
# Username: mybestagent_bot (or similar)
# You'll get: TELEGRAM_BOT_TOKEN

# Add to .env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### 2. Set Webhook (Production)
```bash
# Once backend is deployed to HTTPS:
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -d "url=https://mybestagent.io/api/telegram/webhook"
```

### 3. Test Locally (Optional - Polling)
```bash
# For local testing, use polling instead of webhook
# Create src/api/telegram-polling.js or use a tool
# like ngrok to expose local server

# ngrok tunnel (easy way to test locally)
npx ngrok http 5000
# Gets: https://abc123.ngrok.io
# Then set webhook to: https://abc123.ngrok.io/api/telegram/webhook
```

### 4. Test Bot
- Open Telegram
- Search @mybestagent_bot (or your bot)
- /start
- You should see welcome message
- Click "Login" to authenticate

---

## 🌐 Onboarding Page

### Already Included
The onboarding page is **already ready**:
- File: `agent-saas/onboarding.html`
- Route: `http://localhost:5000/onboarding`

### Test It
```bash
# Backend running on localhost:5000
# Open browser: http://localhost:5000/onboarding

# You'll see:
# - Title: "Choose Your Way to Create"
# - 3 cards: Desktop, Telegram, WhatsApp
# - Each card has CTA button
```

### Customize
- Edit `onboarding.html` directly
- Change Telegram username: `https://t.me/mybestagent_bot`
- Change WhatsApp number: `https://wa.me/...`
- Desktop download: Points to `/api/download/desktop`

---

## 📝 Environment Variables Needed

Minimum for local development:

```env
# Required
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mybestagent_dev
JWT_SECRET=dev_secret_key_12345

# Optional but recommended
TELEGRAM_BOT_TOKEN=your_bot_token
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

---

## 🧪 Testing Commands

### Backend Health
```bash
curl http://localhost:5000/api/health
# {"status":"ok","time":"2024-02-15T..."}
```

### Onboarding Page
```bash
curl http://localhost:5000/onboarding | head -20
# Returns HTML
```

### Desktop Download Endpoint
```bash
curl -I http://localhost:5000/api/download/desktop
# Returns 404 (file doesn't exist locally, that's OK)
# In production, returns the .exe file
```

### Telegram Webhook (Test)
```bash
curl -X POST http://localhost:5000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": { "id": 123456789 },
      "from": { "id": 987654321, "first_name": "TestUser" },
      "text": "/help"
    }
  }'
```

---

## 🚀 Development Workflow

### Backend
```bash
# Terminal 1: Start server with auto-reload
npm run dev

# Terminal 2: Run tests (if available)
npm test

# Terminal 3: Database admin
psql mybestagent_dev
```

### Desktop App
```bash
# Terminal: Start electron dev
cd electron && npm run dev

# Edit files, changes auto-reload in Electron window
# Check console: View → Toggle Developer Tools
```

### Frontend (Web)
```bash
# If you have a separate React app:
cd web
npm run start
# Runs on http://localhost:3000
```

---

## 🐛 Common Issues & Fixes

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres -d mybestagent_dev

# Create database if missing
createdb mybestagent_dev

# Update DATABASE_URL in .env
```

### "Port 5000 already in use"
```bash
# Use different port
PORT=5001 npm start

# Or kill process using 5000:
lsof -ti:5000 | xargs kill -9
```

### "Telegram bot not responding"
```bash
# Check token in .env
echo $TELEGRAM_BOT_TOKEN

# Test token directly
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# Check webhook status
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

### "Electron app won't start"
```bash
# Clear Electron cache
rm -rf electron/dist
rm -rf ~/.config/My\ Best\ Agent

# Reinstall
cd electron && npm install

# Try dev mode with debug
DEBUG=* npm run dev
```

---

## 📚 Next Steps

1. **Modify Telegram Bot**
   - Edit `src/api/routes/telegram.js`
   - Add custom commands
   - Restart server

2. **Customize Desktop App**
   - Edit `electron/app.html` (UI)
   - Edit `electron/app.js` (Logic)
   - Edit `electron/styles.css` (Styling)

3. **Update Onboarding**
   - Edit `onboarding.html`
   - Change colors, text, links
   - Reload at `/onboarding`

4. **Connect Real Claude API**
   - Set `ANTHROPIC_API_KEY` in .env
   - Update chat endpoint: `POST /api/agent/chat`
   - Call Claude API from backend

5. **Deploy to Production**
   - See `DEPLOYMENT.md` for full guide
   - Database migrations
   - Build Electron binaries
   - Register Telegram webhook
   - Deploy to hosting (Render, Railway, AWS, etc.)

---

## 📞 Need Help?

- Check logs: `npm run dev` shows errors in terminal
- Browser console: F12 in Electron/Web app
- Terminal: `npm run dev` with DEBUG mode
- Read full docs: `PROJECT-SETUP.md` and `DEPLOYMENT.md`

---

## ✅ Checklist: You're Ready When...

- [ ] Backend server starts without errors
- [ ] `curl http://localhost:5000/api/health` returns OK
- [ ] Onboarding page loads at `/onboarding`
- [ ] Electron app opens and shows chat interface
- [ ] Telegram bot responds to `/start` (if token set)
- [ ] You can edit files and see changes

**Congratulations! 🎉 You're ready to build!**
