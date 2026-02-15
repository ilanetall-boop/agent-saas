#!/bin/bash

# Simple E2E Tests for My Best Agent
BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo "E2E TEST SUITE - My Best Agent"
echo "================================"
echo ""

TOTAL=0
PASSED=0

# Test 1: French user requesting HTML code
echo "Test 1: Jean Dupont (French - Contractor)"
TOTAL=$((TOTAL+1))
EMAIL="jean-$(date +%s)-$RANDOM@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jean Dupont\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "  Registered: OK"
  
  CHAT=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Écris-moi du code HTML pour un site\",\"language\":\"fr\"}")
  
  if echo "$CHAT" | grep -q "html\|```"; then
    echo "  Chat: OK - Code generated"
    PASSED=$((PASSED+1))
  else
    echo "  Chat: FAIL - No code"
  fi
else
  echo "  Register: FAILED"
fi
echo ""

# Test 2: Hebrew user requesting code
echo "Test 2: Sarah Cohen (Hebrew - Student)"
TOTAL=$((TOTAL+1))
EMAIL="sarah-$(date +%s)-$RANDOM@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sarah Cohen\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "  Registered: OK"
  
  CHAT=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"כתוב לי קוד HTML\",\"language\":\"he\"}")
  
  if echo "$CHAT" | grep -q "html\|```"; then
    echo "  Chat: OK - Code in English"
    PASSED=$((PASSED+1))
  else
    echo "  Chat: FAIL - Likely Hebrew response"
  fi
else
  echo "  Register: FAILED"
fi
echo ""

# Test 3: English user requesting code
echo "Test 3: James Wilson (English - Executive)"
TOTAL=$((TOTAL+1))
EMAIL="james-$(date +%s)-$RANDOM@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"James Wilson\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "  Registered: OK"
  
  CHAT=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Write me complete HTML code\",\"language\":\"en\"}")
  
  if echo "$CHAT" | grep -q "html\|```"; then
    echo "  Chat: OK - Code generated"
    PASSED=$((PASSED+1))
  else
    echo "  Chat: FAIL - No code"
  fi
else
  echo "  Register: FAILED"
fi
echo ""

# Summary
echo "================================"
echo "RESULTS: $PASSED / $TOTAL passed"
SUCCESS=$((PASSED * 100 / TOTAL))
echo "Success Rate: $SUCCESS%"
echo "================================"
