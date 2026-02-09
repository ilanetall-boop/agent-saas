#!/bin/bash

# Telegram Integration Test Script
# Usage: ./test-telegram.sh <bot-token> <user-email> <user-password>

BOT_TOKEN="$1"
USER_EMAIL="$2"
USER_PASS="$3"
API="https://agent-saas.onrender.com/api"

if [ -z "$BOT_TOKEN" ] || [ -z "$USER_EMAIL" ]; then
    echo "Usage: ./test-telegram.sh <bot-token> <user-email> [user-password]"
    echo ""
    echo "Example:"
    echo "  ./test-telegram.sh 123456:ABC-xxxx test@example.com MyPassword123"
    exit 1
fi

USER_PASS="${USER_PASS:-TestPass123!}"

echo "=== Telegram Integration Test ==="
echo ""

# Step 1: Register/Login
echo "1️⃣ Register or login user..."
REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASS\",\"name\":\"TelegramTest\"}")

# Check if already exists
if echo "$REGISTER" | grep -q "déjà utilisé"; then
    echo "User exists, logging in..."
    LOGIN=$(curl -s -X POST $API/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASS\"}")
    TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token: ${TOKEN:0:30}..."
echo ""

# Step 2: Get agent ID
echo "2️⃣ Getting agent ID..."
AGENT=$(curl -s -H "Authorization: Bearer $TOKEN" $API/agent/me)
AGENT_ID=$(echo "$AGENT" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$AGENT_ID" ]; then
    echo "❌ Failed to get agent ID"
    exit 1
fi

echo "✅ Agent ID: $AGENT_ID"
echo ""

# Step 3: Link Telegram bot
echo "3️⃣ Linking Telegram bot..."
LINK=$(curl -s -X POST $API/telegram/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"botToken\":\"$BOT_TOKEN\"}")

if echo "$LINK" | grep -q '"success":true'; then
    echo "✅ Bot linked successfully"
else
    echo "⚠️ Link response: $LINK"
fi
echo ""

# Step 4: Check bot status
echo "4️⃣ Checking bot status..."
STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" $API/telegram/status)
echo "Status: $STATUS"
echo ""

echo "=== MANUAL TEST ==="
echo "1. Open Telegram"
echo "2. Find your bot (use @BotFather to see bot username)"
echo "3. Send a message to the bot"
echo "4. Bot should respond with Alex's response"
echo ""
echo "If bot doesn't respond:"
echo "- Check Render logs for errors"
echo "- Verify bot token is correct"
echo "- Try /start command"
echo ""
echo "Good luck! 🚀"
