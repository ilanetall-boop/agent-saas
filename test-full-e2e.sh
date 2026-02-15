#!/bin/bash

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

PASSED=0
TOTAL=10

echo ""
echo "E2E TESTING - MY BEST AGENT"
echo "==========================="
echo "Testing 10 personas across multiple languages"
echo ""

# Helper function to test persona
test_persona() {
  local NAME=$1
  local ROLE=$2
  local LANG=$3
  local MSG=$4
  
  EMAIL="test-$(date +%s%N)@testmba.dev"
  PASSWORD="TestPassword123!"
  
  echo -n "Testing $NAME ($ROLE)... "
  
  # Register
  REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  
  TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "REGISTER FAILED"
    return
  fi
  
  # Chat
  CHAT=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$MSG\",\"language\":\"$LANG\"}")
  
  if echo "$CHAT" | grep -q '"response"'; then
    echo "OK"
    PASSED=$((PASSED+1))
  else
    echo "CHAT FAILED"
  fi
}

# Test all personas
test_persona "Jean Dupont" "French Contractor" "fr" "Ecris du code html"
test_persona "Sarah Cohen" "Hebrew Student" "he" "code html"
test_persona "Carlos Rodriguez" "Spanish Developer" "es" "Escribe codigo"
test_persona "Emma Mueller" "German Retired" "de" "HTML Code"
test_persona "Marco Rossini" "Italian Manager" "it" "Codice HTML"
test_persona "Li Wei" "Chinese Entrepreneur" "zh" "HTML code"
test_persona "Ahmed Hassan" "Arabic Freelancer" "ar" "code"
test_persona "James Wilson" "English Executive" "en" "Write HTML code"
test_persona "Yuki Tanaka" "Japanese Student" "ja" "HTML code"
test_persona "Alexandra Sokolov" "Russian Startup" "ru" "kod HTML"

echo ""
echo "==========================="
echo "RESULTS: $PASSED / $TOTAL PASSED"
echo "Success Rate: $(($PASSED * 100 / $TOTAL))%"
echo "==========================="
echo ""
