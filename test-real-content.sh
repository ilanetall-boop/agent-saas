#!/bin/bash

# Real-world E2E Tests - WITH ONBOARDING COMPLETION

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo "REAL USER REQUESTS - WITH PROPER ONBOARDING"
echo "============================================"
echo ""

PASSED=0
TOTAL=0

# Helper to complete onboarding
complete_onboarding() {
  local TOKEN=$1
  
  QUESTIONS=(
    "Jean Dupont"
    "I am a renovation contractor"
    "Renovating homes in Paris"
    "Building websites for my business"
    "Yes lets go"
  )
  
  for i in "${!QUESTIONS[@]}"; do
    Q=$((i+1))
    echo -n "  Onboarding Q$Q... "
    
    RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"message\":\"${QUESTIONS[$i]}\",\"language\":\"en\"}")
    
    if echo "$RESPONSE" | grep -q '"response"'; then
      echo "OK"
    else
      echo "FAILED"
      return 1
    fi
    
    sleep 1
  done
  
  return 0
}

# TEST 1: Complete Website Request
echo "TEST 1: Request Complete Website (English)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jean\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "  Registered: OK"
  
  # Complete onboarding
  if complete_onboarding "$TOKEN"; then
    echo "  Onboarding: COMPLETE"
    
    # Now request the website
    sleep 2
    REQUEST="Create a complete professional website in HTML with CSS and JavaScript. Include a header, hero section, services section, and a contact form."
    
    RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"message\":\"$REQUEST\",\"language\":\"en\"}")
    
    # Save for inspection
    echo "$RESPONSE" > /tmp/website-request.json
    
    CONTENT=$(echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep '"response"' | head -1 | cut -d'"' -f4 | head -c 2000)
    
    echo "  Response length: $(echo "$CONTENT" | wc -c) chars"
    
    if echo "$CONTENT" | grep -qi "<!DOCTYPE\|<html\|<head\|<body"; then
      echo "  Status: PASS ✅ - HTML website generated"
      echo "  Sample: ${CONTENT:0:200}..."
      PASSED=$((PASSED+1))
    elif echo "$CONTENT" | grep -qi "<form\|<input\|<button"; then
      echo "  Status: PASS ✅ - HTML elements present"
      PASSED=$((PASSED+1))
    else
      echo "  Status: FAIL ❌ - No HTML content"
      echo "  Got: ${CONTENT:0:300}"
    fi
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""

# TEST 2: French User with Website Request
echo "TEST 2: Request Website en Francais"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Marie\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "  Registered: OK"
  
  # Quick onboarding with French answers
  QUESTIONS=(
    "Marie"
    "Agence de design"
    "Créer des sites modernes"
    "Automatiser mes projets"
    "Oui allons-y"
  )
  
  echo -n "  Onboarding: "
  for Q in "${QUESTIONS[@]}"; do
    curl -s -X POST "$API_URL/agent/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"message\":\"$Q\",\"language\":\"fr\"}" > /dev/null
    sleep 0.5
  done
  echo "COMPLETE"
  
  sleep 2
  REQUEST="Crée-moi un site web complet en HTML. Avec header, hero, services et formulaire contact."
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"fr\"}")
  
  CONTENT=$(echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep '"response"' | head -1 | cut -d'"' -f4 | head -c 2000)
  
  if echo "$CONTENT" | grep -qi "<html\|<!DOCTYPE\|<form"; then
    echo "  Status: PASS ✅ - HTML générée"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL ❌ - No HTML"
  fi
fi

echo ""
echo "============================================"
echo "RESULTS: $PASSED / $TOTAL PASSED"
echo "Success Rate: $(($PASSED * 100 / $TOTAL))%"
echo ""

if [ $PASSED -lt $TOTAL ]; then
  echo "Check /tmp/website-request.json for full response"
fi
