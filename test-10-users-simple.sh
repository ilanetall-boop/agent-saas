#!/bin/bash

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo ""
echo "10 REAL USERS - Different Requests"
echo "===================================="
echo ""

PASSED=0

onboard() {
  curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d '{"message":"User","language":"en"}' > /dev/null
  sleep 0.2
  curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d '{"message":"Small business","language":"en"}' > /dev/null
  sleep 0.2
  curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d '{"message":"Grow","language":"en"}' > /dev/null
  sleep 0.2
  curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d '{"message":"Automate","language":"en"}' > /dev/null
  sleep 0.2
  curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d '{"message":"Yes","language":"en"}' > /dev/null
}

test_one() {
  local NUM=$1
  local NAME=$2
  local REQUEST=$3
  local LANG=$4
  
  echo -n "Test $NUM: $NAME... "
  
  EMAIL="user$NUM-$(date +%s%N)@test.dev"
  
  REG=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"TestPass123!\"}")
  TOKEN=$(echo "$REG" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "FAIL-REG"
    return
  fi
  
  onboard "$TOKEN"
  sleep 1
  
  RESP=$(curl -s -X POST "$API_URL/agent/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"message\":\"$REQUEST\",\"language\":\"$LANG\"}")
  
  if echo "$RESP" | grep -q '"response"'; then
    CONTENT=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])" 2>/dev/null | head -c 500)
    
    if echo "$CONTENT" | grep -qi "code\|html\|script\|step\|save\|copy\|how\|instruction\|create\|file"; then
      echo "PASS"
      PASSED=$((PASSED+1))
    else
      echo "FAIL-CONTENT"
    fi
  else
    echo "FAIL-API"
  fi
}

# Test 1: Website
test_one 1 "Alice" "Create portfolio website HTML CSS JavaScript with instructions how to use" "en"

# Test 2: Contact Form
test_one 2 "Jean" "Formulaire contact HTML simple avec instructions" "fr"

# Test 3: Calculator
test_one 3 "Maria" "Calculadora simple en HTML JavaScript explicame paso a paso" "es"

# Test 4: To-Do List
test_one 4 "David" "אפליקציית to-do list עם הוראות בעברית" "he"

# Test 5: Gallery
test_one 5 "Emma" "Bildergalerie HTML CSS Schritt-für-Schritt Anleitung" "de"

# Test 6: Weather
test_one 6 "Marco" "App meteo semplice HTML JavaScript istruzioni italiane" "it"

# Test 7: Landing Page
test_one 7 "Sarah" "登陆页面 SaaS HTML CSS 详细说明" "zh"

# Test 8: Quiz
test_one 8 "Ahmed" "تطبيق اختبار HTML JavaScript شرح عربي" "ar"

# Test 9: Expense Tracker
test_one 9 "Yuki" "支出トラッカー HTML JavaScript 日本語の説明" "ja"

# Test 10: Game
test_one 10 "Vladimir" "Игра камень ножницы бумага HTML JavaScript пошагово" "ru"

echo ""
echo "===================================="
echo "RESULTS: $PASSED / 10"
echo "Success Rate: $(($PASSED * 100 / 10))%"
echo "===================================="
