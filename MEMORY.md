# Agent-SaaS Memory

## Project Context
- **Started:** 2026-02-08
- **Status:** Early stage, needs testing before selling
- **Stack:** Node.js + Express + SQL.js + Claude API (Anthropic)
- **Deployment:** Render (connected to GitHub: ilanetall-boop/agent-saas)
- **URL:** agent-saas.onrender.com

## What It Does
AI assistant (named "Alex") that:
1. Registers users → creates agent per user
2. Onboarding flow: collect name, job, challenge, needs (5 steps)
3. Normal chat mode after onboarding complete
4. Memory system to remember user context
5. Telegram integration (optional)

## Issues Fixed
- **2026-02-09 05:40** — Model name bug: `claude-3-haiku-20240307` → `claude-3-5-haiku-20241022` (pushed to GitHub, Render redeploying)
- Root cause: Model was deprecated, API returned 404, server crashed silently

## Current State (2026-02-09 05:43 GMT+2)
- Server redeploying with fix
- No proper error logging (catch blocks hide real errors)
- Frontend shows generic "Erreur de connexion au serveur" for any error
- JWT expires in 7 days, no refresh token mechanism
- Database: SQLite stored as file in `./data/agent-saas.db`

## Next Steps (TESTING)
1. Manual testing: signup → onboarding → chat
2. Edge cases: bad inputs, expired tokens, rate limits
3. Add better logging/monitoring
4. Load testing before selling
5. Verify pricing plans (free: 50 msgs, perso: 2000, pro: 10000)

## Architecture Notes
- Auth: JWT (Bearer token in Authorization header)
- DB: sql.js (in-memory + file persist every 30s)
- API: `/api/auth/*`, `/api/agent/*`, `/api/telegram/*`, `/api/health`
- Anthropic model call in `/api/agent/chat` route
- Onboarding prompts change based on step (0-4)

## Test Results (2026-02-09 05:45)
✅ Health check
✅ Register + Login
✅ Token auth works (Bearer header)
✅ Chat/Onboarding starts (responses generated)
✅ Duplicate email rejection
✅ Wrong password rejection
✅ Invalid token → 401

⚠️ BUGS FOUND:
- [ ] Silent errors in try-catch (no proper logging)
- [ ] Frontend catches all errors as "Erreur de connexion au serveur"
- [ ] No refresh token (JWT expires 7 days — hard wall, no way to extend)
- [ ] Rate limiting configured but untested (30 req/min per config)
- [ ] No actual message limit enforcement (config says free=50 but not checked)
- [ ] Telegram integration untested (routes exist but no real tests)
- [ ] No onboarding completion check (missing `/agent/onboarding/complete`)
- [ ] Database persists to local file but Render might lose it on redeploy

## Before Selling
1. Add proper logging (Winston or Pino)
2. Fix message limit enforcement in `/api/agent/chat`
3. Add refresh token mechanism (or increase JWT expiry)
4. Test Telegram webhook integration
5. Load test with 10+ concurrent users
6. Add monitoring/alerts (Sentry or similar)
7. Frontend error handling: show real errors instead of generic message
