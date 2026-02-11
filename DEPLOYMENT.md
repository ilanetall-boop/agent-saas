# Deployment Guide - Agent-SaaS MVP

## Current Status
- **Code**: Pushed to GitHub (commit 04593f7)
- **Render**: Auto-redeploying (in progress)
- **URL**: https://agent-saas.onrender.com

## 🚀 Deployment Steps

### 1. GitHub Push ✅
```bash
cd /home/ilanetall/.openclaw/workspace/agent-saas
git push origin main
```
Status: ✅ Complete (commit 04593f7 pushed)

### 2. Render Auto-Deploy ⏳
- Render watches the main branch
- Automatically rebuilds when new commits arrive
- Current status: **In Progress** (wait 1-3 minutes)
- Check deployment status: https://dashboard.render.com

### 3. Environment Variables (Required)

**Add to Render Dashboard** → Settings → Environment Variables:

```
# Server
NODE_ENV=production
PORT=3000

# Auth
JWT_SECRET=your-secret-here-min-32-chars
REFRESH_SECRET=your-refresh-secret-min-32-chars

# APIs
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=...
OPENAI_API_KEY=sk-...

# Telegram (optional for Phase 2)
TELEGRAM_BOT_TOKEN=...

# Monitoring
SENTRY_DSN=https://... (optional)
```

### 4. Test Health Endpoint

```bash
curl https://agent-saas.onrender.com/api/health
# Expected response:
# {"status":"ok","time":"2026-02-11T07:48:00.000Z"}
```

### 5. Test Dual-Token Flow

**Register:**
```bash
curl -X POST https://agent-saas.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Expected response:
# {
#   "success": true,
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ...",
#   "expiresIn": 1800,
#   "user": { "id": "...", "email": "test@example.com", ... }
# }
```

**Login:**
```bash
curl -X POST https://agent-saas.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Returns accessToken + refreshToken
```

**Refresh Token:**
```bash
ACCESS_TOKEN="eyJ..."
curl -X POST https://agent-saas.onrender.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJ..."}'

# Expected: New accessToken (expires in 30 minutes)
```

**Chat with Error Recovery:**
```bash
curl -X POST https://agent-saas.onrender.com/api/agent/chat \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello agent"}'

# Will automatically retry on transient errors
# Will smart-fix logic errors
# Will ask user for blocked errors
```

---

## 🔍 Monitoring

### Check Deployment Status
1. Go to https://dashboard.render.com
2. Select **agent-saas** service
3. Check **Logs** for errors
4. Status should show **"Active"**

### View Live Logs
```bash
# Check Render logs for errors
https://dashboard.render.com/services/srv-d64ion1r0fns73c8ip00/logs
```

### Health Check
```bash
# Should return OK immediately
curl -w "\n%{http_code}\n" https://agent-saas.onrender.com/api/health
```

---

## 🐛 Troubleshooting

### Issue: Service won't start
- Check env vars are set (especially API keys)
- Review Render logs for missing dependencies
- Verify package.json is correct

### Issue: Health check fails (timeout)
- Render free tier has 15-minute auto-shutdown
- Service needs ~30s to start up
- Try again after 1 minute

### Issue: Token endpoints return errors
- Verify JWT_SECRET is set (min 32 chars)
- Check database file exists (auto-created)
- Review Render logs

### Issue: Chat returns 429 (message limit)
- This is normal after 50 messages on free plan
- Upgrade user plan to continue

---

## 📊 Load Testing (After Deployment)

```bash
# Test 5 concurrent users × 3 messages each
# Before running: Make sure user quota allows

for i in {1..5}; do
  (
    EMAIL="user$i@test.com"
    # Register
    TOKENS=$(curl -s -X POST https://agent-saas.onrender.com/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"pass123\",\"name\":\"User $i\"}")
    ACCESS=$(echo $TOKENS | jq -r '.accessToken')
    
    # Chat 3x
    for j in {1..3}; do
      curl -s -X POST https://agent-saas.onrender.com/api/agent/chat \
        -H "Authorization: Bearer $ACCESS" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"Test message $j\"}"
      echo ""
    done
  ) &
done
wait
```

---

## 🎯 Next Steps

1. ✅ Code pushed to GitHub
2. ⏳ Wait for Render to finish deployment (~2-3 min)
3. ⏳ Test /api/health endpoint
4. ✅ Test dual-token flow (register → login → refresh)
5. ✅ Test error recovery (intentional errors)
6. ✅ Load test (5 concurrent users)
7. ✅ Configure DNS: mybestagent.io → agent-saas.onrender.com (CNAME)
8. ✅ Phase 3: SEO Hub setup

---

## Critical URLs

| Resource | URL |
|----------|-----|
| **API** | https://agent-saas.onrender.com/api |
| **Health** | https://agent-saas.onrender.com/api/health |
| **Render Dashboard** | https://dashboard.render.com/services/srv-d64ion1r0fns73c8ip00 |
| **GitHub Repo** | https://github.com/ilanetall-boop/agent-saas |
| **Domain** | mybestagent.io (DNS pending) |

---

## 📝 Notes

- **Database**: Using SQL.js (SQLite) for MVP
- **Future**: Migrate to Render PostgreSQL Free tier (256MB)
- **Auth**: Dual-token system (30min access + 90day refresh)
- **Error Recovery**: 3-tier (auto-retry, smart-fix, ask-user)
- **APIs**: All 7 models integrated (Claude, OpenAI, Mistral, Gemini, etc.)
- **Monitoring**: Sentry optional (via env var)

---

**Status**: 🚀 Deployment in progress. Update this doc after testing.
