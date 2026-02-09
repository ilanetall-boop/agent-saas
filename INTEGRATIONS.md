# Integrations Guide

## Telegram Bot Integration

### Setup

1. **Create a Telegram Bot**
   - Talk to [@BotFather](https://t.me/botfather) on Telegram
   - Run `/newbot` and follow instructions
   - You'll get a bot token like: `123456:ABC-xxxx`

2. **Link Bot to Agent**
   ```bash
   curl -X POST https://agent-saas.onrender.com/api/telegram/link \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"botToken":"123456:ABC-xxxx"}'
   ```

3. **Start the Bot**
   - Go to your bot on Telegram (search `@YourBotName`)
   - Send `/start` or any message
   - Agent should respond

### How It Works

- Bot runs in **polling mode** (checks Telegram for new messages every 1s)
- Messages stored in conversations DB
- Agent generates response using memory + chat history
- Response sent back to Telegram

### Troubleshooting

If bot doesn't respond:
1. Check Render logs for `Telegram polling error` or `Telegram bot initialized`
2. Verify bot token is correct
3. Try `/start` command explicitly
4. Check agent has no active conversations from web (might conflict)

### Webhook Mode (Advanced)

For production, use webhook instead of polling:
```javascript
// In API routes, when initializing bot:
const result = await initBot({
    agentId: agent.id,
    botToken: botToken,
    webhookUrl: `${process.env.WEBHOOK_URL}/api/telegram/webhook/${agent.id}`
});
```

This is more efficient and doesn't require polling.

---

## Sentry Error Tracking

### Setup

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up for free
   - Create a new project (Node.js)
   - You'll get a DSN like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

2. **Add to Environment**
   - On Render dashboard → Environment
   - Add: `SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - Redeploy

3. **Verify**
   - Go to https://agent-saas.onrender.com/api/health
   - Check Render logs for `✅ Sentry initialized`
   - Trigger an error (e.g., invalid token)
   - Check Sentry dashboard → Issues → should see the error

### What Gets Tracked

- ❌ HTTP errors (4xx, 5xx)
- ❌ Unhandled exceptions
- ❌ API request errors
- ❌ Telegram bot errors
- ✅ Error messages, stack traces, user context (email, user ID)

### Viewing Errors

- **Sentry Dashboard** → Issues → Click error
- See: status, frequency, users affected, stack trace, request body
- **Alerts** → Set up email/Slack notifications when errors spike

---

## Monitoring Checklist

- [ ] Sentry DSN set on Render
- [ ] Errors appearing in Sentry dashboard
- [ ] Telegram bot created and linked
- [ ] Test bot responds in Telegram
- [ ] Load test (5+ concurrent users)
- [ ] Rate limiting working (30 req/min per config)
