#!/bin/bash

# 10 DIFFERENT REAL USERS with DIFFERENT REQUESTS
# Verify Eva provides INSTRUCTIONS, not just code

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "10 REAL USER TESTS - Code + Complete Instructions"
echo "════════════════════════════════════════════════════════════"
echo ""

PASSED=0
TOTAL=10

# Helper function
complete_onboarding_quick() {
  local TOKEN=$1
  
  ANSWERS=("User" "Small business" "Grow my business" "Automate processes" "Yes")
  
  for ANS in "${ANSWERS[@]}"; do
    curl -s -X POST "$API_URL/agent/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"message\":\"$ANS\",\"language\":\"en\"}" > /dev/null
    sleep 0.3
  done
}

# TEST 1: Portfolio Website
test_user() {
  local NUM=$1
  local NAME=$2
  local PROFESSION=$3
  local REQUEST=$4
  local LANG=$5
  
  echo "[Test $NUM/$TOTAL] $NAME - $PROFESSION"
  echo "Request: ${REQUEST:0:60}..."
  
  TOTAL=$((TOTAL))
  
  EMAIL="user-$NUM-$(date +%s%N)@testmba.dev"
  PASSWORD="TestPassword123!"
  
  # Register
  REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  
  TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "Status: FAIL - Registration failed"
    echo ""
    return 1
  fi
  
  echo "  • Registered OK"
  
  # Quick onboarding
  complete_onboarding_quick "$TOKEN" 2>/dev/null
  sleep 1
  echo "  • Onboarding done"
  
  # Send request
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"$LANG\"}")
  
  # Check response contains:
  # 1. Code (html/javascript/etc)
  # 2. Instructions (how to use it)
  
  CONTENT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', ''))" 2>/dev/null)
  
  HAS_CODE=0
  HAS_INSTRUCTIONS=0
  
  # Check for code indicators
  if echo "$CONTENT" | grep -qi "```\|<html\|<script\|<form\|function\|const\|var"; then
    HAS_CODE=1
  fi
  
  # Check for instructions
  if echo "$CONTENT" | grep -qi "step\|save\|create\|file\|open\|click\|copy\|paste\|run\|browser\|how to\|instructions\|follow"; then
    HAS_INSTRUCTIONS=1
  fi
  
  if [ $HAS_CODE -eq 1 ] && [ $HAS_INSTRUCTIONS -eq 1 ]; then
    echo "Status: PASS ✅ - Code + Instructions"
    echo "  • Code: YES"
    echo "  • Instructions: YES"
    PASSED=$((PASSED+1))
  elif [ $HAS_CODE -eq 1 ]; then
    echo "Status: PARTIAL ⚠️ - Code only (no instructions)"
    echo "  • Code: YES"
    echo "  • Instructions: NO"
  else
    echo "Status: FAIL ❌ - No code or instructions"
    echo "  • Sample response: ${CONTENT:0:150}"
  fi
  
  echo ""
}

# ============================================
# TEST 1: Portfolio Website
# ============================================
test_user 1 "Alice Martin" "Freelance Designer" \
  "I'm a graphic designer. Can you create me a beautiful portfolio website in HTML/CSS to showcase my work? I don't know how to code." \
  "en"

# TEST 2: Contact Form (French)
# ============================================
test_user 2 "Jean Dubois" "Petit Restaurant" \
  "Je veux un formulaire de contact simple en HTML pour mon restaurant. Comment je peux l'utiliser?" \
  "fr"

# TEST 3: Calculator App
# ============================================
test_user 3 "Maria Garcia" "Student" \
  "Write me a simple calculator app in HTML and JavaScript. I want to add, subtract, multiply and divide. Tell me exactly how to use it." \
  "es"

# TEST 4: To-Do List
# ============================================
test_user 4 "David Cohen" "Busy Professional" \
  "אני צריך יישום to-do list בHTML וJavaScript. אתה יכול להסביר לי בדיוק איך להשתמש בזה? צעד אחר צעד." \
  "he"

# TEST 5: Image Gallery
# ============================================
test_user 5 "Emma Mueller" "Photography Business" \
  "Erstelle eine einfache Bildergalerie in HTML und CSS. Ich brauche eine Schritt-für-Schritt-Anleitung, wie ich meine Bilder einfügen kann." \
  "de"

# TEST 6: Weather App (API)
# ============================================
test_user 6 "Marco Rossi" "Learning Developer" \
  "Crea una semplice app meteo in HTML/CSS/JavaScript che mostri la temperatura. Spiega come implementarla passo per passo." \
  "it"

# TEST 7: Landing Page with CTA
# ============================================
test_user 7 "Sarah Chen" "SaaS Startup" \
  "我需要一个着陆页面来推广我的SaaS产品。包括标题、功能列表和注册按钮。请详细说明如何使用这个代码。" \
  "zh"

# TEST 8: Quiz Application
# ============================================
test_user 8 "Ahmed Ali" "Teacher" \
  "أريد تطبيق اختبار بسيط في HTML و JavaScript. كيف أضيف أسئلتي الخاصة؟ اشرح لي خطوة بخطوة." \
  "ar"

# TEST 9: Expense Tracker
# ============================================
test_user 9 "Yuki Tanaka" "Personal Finance Enthusiast" \
  "シンプルな支出追跡アプリをHTML/JavaScriptで作成してください。使い方を詳しく説明してください。" \
  "ja"

# TEST 10: Game (Rock Paper Scissors)
# ============================================
test_user 10 "Vladimir Petrov" "Game Enthusiast" \
  "Создай простую игру в камень-ножницы-бумага на HTML и JavaScript. Объясни пошагово как её запустить." \
  "ru"

# SUMMARY
echo "════════════════════════════════════════════════════════════"
echo "RESULTS: $PASSED / 10 PASSED"
echo "Success Rate: $(($PASSED * 100 / 10))%"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $PASSED -eq 10 ]; then
  echo "✅ ALL TESTS PASSED - Eva provides code + instructions!"
elif [ $PASSED -ge 8 ]; then
  echo "⚠️  MOSTLY GOOD - 8+ tests passed"
elif [ $PASSED -ge 5 ]; then
  echo "⚠️  PARTIAL SUCCESS - Eva generates code but missing instructions"
else
  echo "❌ NEEDS IMPROVEMENT - Eva not following the format"
fi

echo ""
