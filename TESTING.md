# Testing Guide - Agent-SaaS

## Automated Tests (Run Before Deploying)

### Quick Health Check
```bash
curl https://agent-saas.onrender.com/api/health
```

### Register + Chat Full Flow
```bash
# 1. Register
REGISTER=$(curl -s -X POST https://agent-saas.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","name":"Test"}')

# 2. Extract token
TOKEN=$(echo $REGISTER | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 3. Send message (should get response)
curl -s -X POST https://agent-saas.onrender.com/api/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

## Manual Tests (Browser)

### Test 1: Happy Path
1. Go to https://agent-saas.onrender.com
2. Register with new email
3. Complete onboarding (5 steps)
4. Chat in normal mode
5. Verify message limit counter updates

### Test 2: Message Limit Enforcement
1. Register with free plan (50 messages)
2. Send 50 messages (use script to spam)
3. 51st message should fail with 429 "Limite de messages atteinte"
4. Verify remaining count = 0

### Test 3: Error Handling
1. Send empty message → should error
2. Login with wrong password → should error
3. Send without Authorization header → 401
4. Use invalid/expired token → 401

### Test 4: Onboarding Skip
1. Register
2. Go to `/app.html` and manually set localStorage token
3. Try to chat before completing onboarding
4. Should force onboarding prompts, not free chat

## Telegram Integration Testing (Manual)

1. Create a Telegram bot via @BotFather
2. Call `/api/telegram/init` with agentId
3. Start the bot in Telegram
4. Verify `/api/telegram/status` returns connected
5. Send message in Telegram → should get response
6. Verify message appears in conversation history

## Load Testing

```bash
# Test with 10 concurrent users
for i in {1..10}; do
  (
    # Register + send 5 messages per user
    EMAIL="loadtest-$i-$(date +%s)@example.com"
    REGISTER=$(curl -s -X POST https://agent-saas.onrender.com/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"Pass123!\",\"name\":\"LT$i\"}")
    TOKEN=$(echo $REGISTER | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    for j in {1..5}; do
      curl -s -X POST https://agent-saas.onrender.com/api/agent/chat \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"Load test message $j\"}" > /dev/null
      sleep 0.5
    done
    echo "User $i completed"
  ) &
done
wait
echo "Load test done"
```

## Known Issues & Fixes Applied

- ✅ Model deprecated (claude-3-haiku) → updated to claude-3-5-haiku-20241022
- ✅ Message limit not enforced → added strict check with fresh user data
- ✅ JWT expires too soon (7d) → increased to 30d
- ✅ Silent errors in catch blocks → added detailed logging
- ✅ Frontend shows generic errors → now shows actual error messages with status codes

## Pre-Sales Checklist

- [ ] All tests pass
- [ ] No silent errors in logs
- [ ] Message limits enforced correctly
- [ ] Telegram integration tested (if selling with feature)
- [ ] Load test passes (10+ concurrent users)
- [ ] Database backup working
- [ ] SSL/TLS certificate valid
- [ ] Privacy policy & T&Cs added to legal.html
