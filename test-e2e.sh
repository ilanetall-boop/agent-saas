#!/bin/bash

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo "Running E2E Tests"
echo ""

TOTAL=0
PASSED=0

# Test 1: French
echo "TEST 1: French User"
TOTAL=1
EMAIL="jean-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

RESULT=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jean\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$RESULT" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "Register OK"
  PASSED=1
  
  CHAT=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"code html","language":"fr"}')
  
  if echo "$CHAT" | grep -q '"response"'; then
    echo "Chat OK"
  else
    echo "Chat FAILED"
  fi
else
  echo "Register FAILED"
fi

echo ""
echo "Results: $PASSED / $TOTAL"
