# My Best Agent - Project Setup & Architecture

Complete guide for the **Onboarding**, **Telegram Bot**, and **Desktop App** implementations.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   USER ENTRY POINTS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌐 Web               🤖 Telegram              💻 Desktop    │
│  /onboarding         @mybestagent_bot          Electron     │
│  /app.html           /api/telegram/webhook     IPC Bridge   │
│                                                              │
└────────────┬──────────────────┬─────────────────────┬────────┘
             │                  │                     │
             └──────────┬───────┴─────────┬───────────┘
                        │                 │
                    ┌───▼─────────────────▼─────┐
                    │   BACKEND API SERVER      │
                    ├───────────────────────────┤
                    │ Express.js + Node.js      │
                    │                           │
                    │ Routes:                   │
                    │ • /api/auth/              │
                    │ • /api/agent/chat         │
                    │ • /api/telegram/          │
                    │ • /api/download/desktop   │
                    │ • /api/desktop/execute    │
                    │                           │
                    │ Middleware:               │
                    │ • Auth (JWT)              │
                    │ • CORS                    │
                    │ • Rate Limiting           │
                    │ • Error Handling          │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  DATABASE & SERVICES    │
                    ├───────────────────────────┤
                    │ • PostgreSQL             │
                    │ • Redis (caching)        │
                    │ • Claude API             │
                    │ • File Storage (S3)      │
                    └────────────────────────────┘
```

---

## 📂 Directory Structure

```
agent-saas/
├── onboarding.html              ← Onboarding UI
├── electron/                    ← Desktop App
│   ├── main.js                 (Electron main process)
│   ├── preload.js              (Secure API bridge)
│   ├── app.html                (UI - chat, files, settings)
│   ├── app.js                  (UI controller)
│   ├── styles.css              (Styling)
│   ├── package.json            (Electron config & dependencies)
│   └── dist/                   (Built apps)
│       ├── MyBestAgent-x.dmg   (macOS)
│       ├── MyBestAgent Setup x.exe  (Windows)
│       └── MyBestAgent-x.AppImage   (Linux)
│
├── src/
│   └── api/
│       ├── server.js           (Express server, routes)
│       ├── config.js           (Configuration)
│       ├── middleware/
│       │   └── auth.js         (JWT verification)
│       ├── routes/
│       │   ├── auth.js         (Authentication)
│       │   ├── agents.js       (Chat, memory)
│       │   ├── payments.js     (Payments)
│       │   ├── oauth.js        (OAuth providers)
│       │   └── telegram.js     ← TELEGRAM BOT (NEW)
│       └── db/
│           └── db.js           (Database connection)
│
├── public/
│   ├── index.html              (Landing page)
│   ├── app.html                (Web app)
│   ├── favicon.svg
│   └── ...
│
├── DEPLOYMENT.md               ← Deployment guide
├── PROJECT-SETUP.md            ← This file
├── .env.example                ← Environment template
├── package.json                ← Backend dependencies
└── .gitignore
```

---

## 🎯 Three Solutions

### 1. 🎨 Onboarding Screen (`onboarding.html`)

**Purpose:** Let users choose how to interact with the agent

**Features:**
- 3 clickable cards with clear CTAs
- Matches design system (mauve #635bff)
- Responsive (mobile first)
- Tracks user preferences (localStorage)
- Skip option to web app

**Route:** `GET /onboarding` or `https://mybestagent.io/onboarding`

**Links:**
- Desktop: `/api/download/desktop` → Download Electron app
- Telegram: `https://t.me/mybestagent_bot` → Telegram bot
- WhatsApp: `https://wa.me/...` → WhatsApp Business API
- Skip: `/app.html` → Web app

**No Build Required** - Serve as static HTML

---

### 2. 🤖 Telegram Bot Integration (`src/api/routes/telegram.js`)

**Purpose:** Chat interface on Telegram

**How It Works:**
1. User sends message to @mybestagent_bot
2. Telegram sends webhook to `/api/telegram/webhook`
3. Backend receives message, authenticates user
4. Sends to Claude API
5. Returns response with inline buttons
6. User can execute actions (create file, open URL, etc.)

**Authentication:**
```
User: /start
↓
Bot: "Login to link your account"
↓
User clicks button → visits /auth/telegram?chat_id=...
↓
User logs in via OAuth/Email
↓
Backend: /api/telegram/auth/:token
↓
Session stored: telegram_id → account
```

**Commands:**
- `/start` - Welcome & authenticate
- `/help` - Show available commands
- `/create` - Create something new
- `/image` - Generate an image
- `/code` - Write code
- `/video` - Create a video

**API Endpoints:**
```
POST /api/telegram/webhook    - Receive messages from Telegram
GET  /api/telegram/auth/:token - Authenticate user
POST /api/telegram/send       - Send message from backend
```

**Integration in server.js:**
```javascript
app.use('/api/telegram', require('./routes/telegram'));
```

**Dependencies Added:**
```json
{
  "axios": "^1.6.0",
  "telegram-bot-api": "^1.3.5"
}
```

---

### 3. 💻 Desktop App (Electron)

**Purpose:** Full-featured desktop client with local file access

**Architecture:**
```
┌─────────────────────────────────┐
│    Electron Window              │
│  (Renderer Process - Sandboxed) │
│  ┌─────────────────────────────┐│
│  │ Chat Interface (React-like) ││
│  │ - Message input            ││
│  │ - Chat history             ││
│  │ - File browser             ││
│  │ - Settings                 ││
│  └─────────────────────────────┘│
│          ↓ ipcRenderer          │
├─────────────────────────────────┤
│      Electron Main Process      │
│  (preload.js - Context Bridge)  │
│  ┌─────────────────────────────┐│
│  │ window.api = {              ││
│  │   files, exec, system,      ││
│  │   clipboard, auth, app      ││
│  │ }                           ││
│  └─────────────────────────────┘│
│          ↓ ipcMain              │
├─────────────────────────────────┤
│      Electron Main Process      │
│     (main.js - IPC Handlers)    │
│  ┌─────────────────────────────┐│
│  │ File Operations             ││
│  │ - fs.readFile()            ││
│  │ - fs.writeFile()           ││
│  │ System Info & Exec         ││
│  │ - shell.openPath()         ││
│  │ Clipboard Access           ││
│  │ - clipboard.readText()     ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
         ↓ HTTPS
    ┌──────────────────────────┐
    │   Backend API Server     │
    │  /api/agent/chat         │
    │  /api/auth/              │
    └──────────────────────────┘
```

**Features:**
- Chat interface (like web app)
- File read/write (any directory with user permission)
- Execute system commands
- Clipboard access
- Open URLs/files
- Get system info
- Auto-update checking
- Dark mode support

**API Bridge (window.api):**
```javascript
// Files
files.read(path) → { success, content }
files.write(path, content) → { success }
files.list(path) → { success, files: [...] }
files.delete(path) → { success }

// Execution
exec.run(command) → { success, output, error }
exec.open(filePath) → { success }
exec.openUrl(url) → { success }

// System
system.home() → { success, path }
system.desktop() → { success, path }
system.getInfo() → { success, info: {...} }

// Clipboard
clipboard.read() → { success, content }
clipboard.write(text) → { success }

// Backend
api.call(method, endpoint, data, token) → { success, data }

// Updates
app.checkUpdates() → { hasUpdate, latestVersion, downloadUrl }
```

**Files:**
- `main.js` - Electron main process (IPC handlers)
- `preload.js` - Context bridge (secure API exposure)
- `app.html` - UI template
- `app.js` - UI controller
- `styles.css` - Styling
- `package.json` - Config + dependencies

**Build:**
```bash
npm run build      # All platforms
npm run build:mac  # macOS
npm run build:win  # Windows
npm run build:linux # Linux
```

**Distribution:**
```
https://mybestagent.io/api/download/desktop
→ MyBestAgent-Setup.exe (or .dmg/.AppImage)
```

**Auto-Update:**
```
Startup → GET /api/app/latest-version
→ { version, downloadUrl }
→ If newer, prompt user to download
```

---

## 🔐 Security Model

### Authentication Flow
```
1. User logs in (email/OAuth)
   ↓
2. Backend issues:
   - accessToken (15 min) → stored in memory
   - refreshToken (30 days) → httpOnly cookie
   ↓
3. All API calls use accessToken
   ↓
4. Token expires → use refreshToken to get new accessToken
   ↓
5. Logout → revoke refreshToken
```

### Desktop App Security
```
1. Renderer process (UI) runs in sandbox
   - Can't access filesystem directly
   - Can't execute commands
   - Can't access system APIs

2. preload.js bridges UI to main process
   - Only exposes explicit APIs via contextBridge
   - No eval(), require(), or dynamic code

3. Main process (trusted)
   - Validates all requests from renderer
   - Checks JWT token for API calls
   - Limits file operations to user-approved directories
   - Logs all actions for audit trail

4. After first login
   - User grants "Trusted" permission once
   - No more prompts for file access, etc.
```

### Telegram Bot Security
```
1. Webhook endpoint validates Telegram signature
2. User must authenticate before using features
3. Session stored securely with token
4. Rate limiting on webhook endpoint
5. All messages logged for audit
```

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your secrets

# Start server
npm start

# Verify
curl http://localhost:5000/api/health
```

### 2. Telegram Bot
```bash
# 1. Get bot token from @BotFather

# 2. Set environment variable
TELEGRAM_BOT_TOKEN=<your_token>

# 3. Webhook auto-registers on server start
# Or manually:
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://mybestagent.io/api/telegram/webhook"

# 4. Test with bot
@mybestagent_bot /start
```

### 3. Desktop App (Development)
```bash
cd electron
npm install
npm run dev
# Opens Electron window with hot reload
```

### 4. Desktop App (Build & Release)
```bash
cd electron
npm run build
# Creates:
# - electron/dist/MyBestAgent-x.x.x.dmg (macOS)
# - electron/dist/MyBestAgent Setup x.x.x.exe (Windows)
# - electron/dist/MyBestAgent-x.x.x.AppImage (Linux)

# Upload to CDN/GitHub Releases
# Update /api/app/latest-version endpoint
```

### 5. Onboarding
```bash
# Just serve static file at /onboarding
# No build required
# Design matches index.html
```

---

## 📊 User Journey

### New User Flow
```
1. User visits https://mybestagent.io
   ↓
2. Clicks "Start free"
   ↓
3. Signs up (email/OAuth)
   ↓
4. Redirected to /onboarding
   ↓
5. Chooses platform:
   
   a) Desktop
      ↓ Downloads Electron app
      ↓ Opens app, logs in
      ↓ Can create files, execute commands
      
   b) Telegram
      ↓ Opens Telegram, adds bot
      ↓ Sends /start
      ↓ Clicks "Login" button
      ↓ Completes auth in browser
      ↓ Links account to Telegram
      ↓ Can chat on Telegram
      
   c) WhatsApp
      ↓ Opens WhatsApp, starts chat
      ↓ Completes auth
      ↓ Can chat on WhatsApp
      
   d) Skip
      ↓ Goes to /app.html
      ↓ Uses web chat interface
```

---

## 🔄 Data Flow Examples

### Desktop App: Create File

```javascript
User types: "Create a Python script that reads CSV"

1. Client (app.js):
   sendMessage("Create a Python script...")
   ↓
2. API Call:
   POST /api/agent/chat
   { message: "Create a Python script..." }
   ↓
3. Backend:
   - Claude generates response
   - Includes action: { type: "create_file", path: "script.py", content: "..." }
   ↓
4. Response:
   { reply: "Here's your script...", actions: [{type: "create_file", ...}] }
   ↓
5. Client (app.js):
   handleActions(actions)
   → api.files.write('/Users/john/Desktop/script.py', '...')
   ↓
6. Main Process (main.js):
   fs.writeFile('/Users/john/Desktop/script.py', '...')
   ↓
7. File created locally ✅
```

### Telegram: Generate Image

```
User: "Generate a logo"

1. Telegram receives message
   ↓
2. POST /api/telegram/webhook
   ↓
3. Backend checks auth
   ↓
4. Sends to Claude: "Generate a logo"
   ↓
5. Claude responds with image URL
   ↓
6. Backend sends to Telegram:
   sendPhoto(chatId, imageUrl)
   ↓
7. User sees image in Telegram ✅
```

---

## 📝 Code Examples

### Send Message from Desktop App
```javascript
async sendMessage() {
    const message = document.getElementById('messageInput').value;
    
    // Call API
    const result = await window.api.api.call(
        'POST',
        '/api/agent/chat',
        { message },
        this.authToken
    );
    
    // Display response
    if (result.success) {
        this.addMessage(result.data.reply, 'assistant');
        await this.handleActions(result.data.actions);
    }
}
```

### Create File from Main Process
```javascript
ipcMain.handle('file:write', async (event, filePath, content) => {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

### Send Telegram Message from Backend
```javascript
async function sendMessage(chatId, text, keyboard = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };
    
    if (keyboard) {
        payload.reply_markup = keyboard;
    }
    
    const response = await axios.post(
        `${TELEGRAM_API_URL}/sendMessage`,
        payload
    );
    return response.data;
}
```

---

## 🎯 Next Steps

1. **Deploy Backend**
   - Set up database (PostgreSQL)
   - Configure environment variables
   - Deploy to production (Render, Heroku, AWS, etc.)
   - Set up monitoring & logging

2. **Register Telegram Bot**
   - Chat with @BotFather
   - Create bot, get token
   - Register webhook

3. **Build Desktop App**
   - Run `npm run build` in electron/
   - Sign binaries (for macOS/Windows)
   - Upload to CDN or GitHub Releases
   - Test auto-update mechanism

4. **Test All Three**
   - Onboarding at /onboarding
   - Telegram bot @mybestagent_bot
   - Desktop app download

5. **Monitor & Iterate**
   - Track metrics (users, errors, etc.)
   - Collect feedback
   - Release updates

---

## 📚 Documentation

- `DEPLOYMENT.md` - Detailed deployment guide
- `electron/README.md` - Electron app docs
- `src/api/routes/telegram.js` - Telegram implementation
- `onboarding.html` - Onboarding component

---

## 🆘 Support

- Check logs for errors
- Test endpoints with curl
- Review environment variables
- Check GitHub Issues
- Contact: support@mybestagent.io
