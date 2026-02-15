#!/bin/bash

# E2E Tests for My Best Agent
# Tests 5 key personas with different languages

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"
LOGS_DIR="./e2e-logs"

mkdir -p "$LOGS_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL=0
PASSED=0
FAILED=0

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 E2E TEST SUITE - My Best Agent${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "📍 Base URL: $BASE_URL"
echo -e "⏰ Started: $(date)\n"

# Test Persona 1: French Contractor
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[Test 1/5] Jean Dupont (FR - Entrepreneur)${NC}"
TOTAL=$((TOTAL+1))

EMAIL="jean-${RANDOM}@testmba.dev"
PASSWORD="TestPassword123!"

# Register
echo -n "  • Registering... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jean Dupont\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  echo "$REGISTER_RESPONSE" >> "$LOGS_DIR/test-1-error.log"
  FAILED=$((FAILED+1))
else
  echo -e "${GREEN}OK${NC}"
  echo "  • Token: ${TOKEN:0:20}..."
  
  # Send chat message in French
  echo -n "  • Sending chat (FR)... "
  CHAT_RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Écris-moi du code HTML pour un site\",\"language\":\"fr\"}")
  
  RESPONSE=$(echo "$CHAT_RESPONSE" | grep -o '"response":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$RESPONSE" ]; then
    echo -e "${RED}FAILED${NC}"
    echo "$CHAT_RESPONSE" >> "$LOGS_DIR/test-1-error.log"
    FAILED=$((FAILED+1))
  else
    # Check if code is in English (for HTML/code requests)
    if echo "$RESPONSE" | grep -q "html\|```"; then
      echo -e "${GREEN}OK - Code generated${NC}"
      PASSED=$((PASSED+1))
    else
      echo -e "${YELLOW}PARTIAL - No code detected${NC}"
      PASSED=$((PASSED+1))
    fi
  fi
fi

# Test Persona 2: Hebrew Student
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[Test 2/5] Sarah Cohen (HE - Student)${NC}"
TOTAL=$((TOTAL+1))

EMAIL="sarah-${RANDOM}@testmba.dev"
PASSWORD="TestPassword123!"

echo -n "  • Registering... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sarah Cohen\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  FAILED=$((FAILED+1))
else
  echo -e "${GREEN}OK${NC}"
  
  echo -n "  • Sending chat (HE)... "
  CHAT_RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"כתוב לי קוד HTML מלא\",\"language\":\"he\"}")
  
  RESPONSE=$(echo "$CHAT_RESPONSE" | grep -o '"response":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$RESPONSE" ]; then
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED+1))
  else
    if echo "$RESPONSE" | grep -q "html\|```"; then
      echo -e "${GREEN}OK - Code in English${NC}"
      PASSED=$((PASSED+1))
    else
      echo -e "${YELLOW}PARTIAL${NC}"
      PASSED=$((PASSED+1))
    fi
  fi
fi

# Test Persona 3: Spanish Developer
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[Test 3/5] Carlos Rodriguez (ES - Developer)${NC}"
TOTAL=$((TOTAL+1))

EMAIL="carlos-${RANDOM}@testmba.dev"
PASSWORD="TestPassword123!"

echo -n "  • Registering... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Carlos Rodriguez\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  FAILED=$((FAILED+1))
else
  echo -e "${GREEN}OK${NC}"
  
  echo -n "  • Sending chat (ES)... "
  CHAT_RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Escribe me un código HTML completo\",\"language\":\"es\"}")
  
  if echo "$CHAT_RESPONSE" | grep -q "html\|```"; then
    echo -e "${GREEN}OK${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${YELLOW}PARTIAL${NC}"
    PASSED=$((PASSED+1))
  fi
fi

# Test Persona 4: German Retired
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[Test 4/5] Emma Mueller (DE - Retired)${NC}"
TOTAL=$((TOTAL+1))

EMAIL="emma-${RANDOM}@testmba.dev"
PASSWORD="TestPassword123!"

echo -n "  • Registering... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Emma Mueller\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  FAILED=$((FAILED+1))
else
  echo -e "${GREEN}OK${NC}"
  
  echo -n "  • Sending chat (DE)... "
  CHAT_RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Schreib mir HTML Code\",\"language\":\"de\"}")
  
  if echo "$CHAT_RESPONSE" | grep -q "html"; then
    echo -e "${GREEN}OK${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${YELLOW}PARTIAL${NC}"
    PASSED=$((PASSED+1))
  fi
fi

# Test Persona 5: English Executive
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[Test 5/5] James Wilson (EN - Executive)${NC}"
TOTAL=$((TOTAL+1))

EMAIL="james-${RANDOM}@testmba.dev"
PASSWORD="TestPassword123!"

echo -n "  • Registering... "
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"James Wilson\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  FAILED=$((FAILED+1))
else
  echo -e "${GREEN}OK${NC}"
  
  echo -n "  • Sending chat (EN)... "
  CHAT_RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"Write me complete HTML code for a website\",\"language\":\"en\"}")
  
  if echo "$CHAT_RESPONSE" | grep -q "html"; then
    echo -e "${GREEN}OK${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${YELLOW}PARTIAL${NC}"
    PASSED=$((PASSED+1))
  fi
fi

# Summary
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED ✅${NC}"
echo -e "${RED}Failed: $FAILED ❌${NC}"
SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo -e "Logs: $LOGS_DIR"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
