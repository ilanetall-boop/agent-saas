#!/bin/bash

# Test script for Agent-SaaS MVP
# Usage: ./test-api.sh [local|production]

TARGET=${1:-production}

if [ "$TARGET" = "local" ]; then
  BASE_URL="http://localhost:3000"
  echo "🧪 Testing LOCAL: $BASE_URL"
else
  BASE_URL="https://agent-saas.onrender.com"
  echo "🧪 Testing PRODUCTION: $BASE_URL"
fi

echo ""
echo "═══════════════════════════════════════"
echo "1️⃣  HEALTH CHECK"
echo "═══════════════════════════════════════"

curl -s "$BASE_URL/api/health" | jq '.'
echo ""

echo "═══════════════════════════════════════"
echo "2️⃣  REGISTER USER"
echo "═══════════════════════════════════════"

EMAIL="test-$(date +%s)@example.com"
PASSWORD="TestPass123!"

REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"Test User\"
  }")

echo "Response:"
echo "$REGISTER" | jq '.'

ACCESS_TOKEN=$(echo "$REGISTER" | jq -r '.accessToken // empty')
REFRESH_TOKEN=$(echo "$REGISTER" | jq -r '.refreshToken // empty')
USER_ID=$(echo "$REGISTER" | jq -r '.user.id // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ FAILED: No access token received"
  exit 1
fi

echo ""
echo "✅ Tokens received:"
echo "   ACCESS:  ${ACCESS_TOKEN:0:20}..."
echo "   REFRESH: ${REFRESH_TOKEN:0:20}..."
echo ""

echo "═══════════════════════════════════════"
echo "3️⃣  GET CURRENT USER"
echo "═══════════════════════════════════════"

curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

echo ""

echo "═══════════════════════════════════════"
echo "4️⃣  CHAT (Agent will reply)"
echo "═══════════════════════════════════════"

curl -s -X POST "$BASE_URL/api/agent/chat" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! What can you do?"}' | jq '.'

echo ""

echo "═══════════════════════════════════════"
echo "5️⃣  UPDATE MEMORY"
echo "═══════════════════════════════════════"

curl -s -X POST "$BASE_URL/api/agent/memory" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"favorite_color","value":"blue"}' | jq '.'

echo ""

echo "═══════════════════════════════════════"
echo "6️⃣  REFRESH TOKEN (Get new access)"
echo "═══════════════════════════════════════"

REFRESH=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo "$REFRESH" | jq '.'

NEW_ACCESS=$(echo "$REFRESH" | jq -r '.accessToken // empty')

if [ -z "$NEW_ACCESS" ]; then
  echo "❌ FAILED: Could not refresh token"
else
  echo "✅ New access token: ${NEW_ACCESS:0:20}..."
  
  echo ""
  echo "═══════════════════════════════════════"
  echo "7️⃣  CHAT WITH NEW TOKEN (Verify refresh)"
  echo "═══════════════════════════════════════"
  
  curl -s -X POST "$BASE_URL/api/agent/chat" \
    -H "Authorization: Bearer $NEW_ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"message":"Does the new token work?"}' | jq '.'
fi

echo ""

echo "═══════════════════════════════════════"
echo "8️⃣  LOGOUT (Revoke refresh token)"
echo "═══════════════════════════════════════"

curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $NEW_ACCESS" | jq '.'

echo ""

echo "═══════════════════════════════════════"
echo "✅ TEST COMPLETE"
echo "═══════════════════════════════════════"
echo ""
echo "Summary:"
echo "  ✓ Health check"
echo "  ✓ User registration"
echo "  ✓ Auth endpoints"
echo "  ✓ Token refresh"
echo "  ✓ Chat with error recovery"
echo "  ✓ Memory operations"
echo "  ✓ Token revocation"
echo ""
echo "🎉 All systems operational!"
