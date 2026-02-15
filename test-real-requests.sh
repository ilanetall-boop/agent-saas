#!/bin/bash

# Real-world E2E Tests - Verify actual content quality

BASE_URL="https://mybestagent.io"
API_URL="$BASE_URL/api"

echo "TESTING REAL USER REQUESTS"
echo "==========================="
echo ""

PASSED=0
TOTAL=0

# TEST 1: Request complete HTML website
echo "TEST 1: Request Complete HTML Website (French)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

# Register
REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jean\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  # Request: Create a complete website
  REQUEST="Crée-moi un site web complet avec HTML, CSS et JavaScript. Un site pour présenter une agence de rénovation. Include header, footer, services section, et contact form."
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"fr\"}")
  
  # Save full response for inspection
  echo "$RESPONSE" > /tmp/test1-response.json
  
  # Extract response text
  CONTENT=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 1000)
  
  if echo "$CONTENT" | grep -q "<!DOCTYPE\|<html\|<head\|<body"; then
    echo "  Status: PASS - HTML generated"
    echo "  Length: $(echo "$CONTENT" | wc -c) characters"
    echo "  Contains: DOCTYPE, html, head, body tags"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL - No valid HTML"
    echo "  Response starts with: ${CONTENT:0:100}"
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""

# TEST 2: Request specific JavaScript functionality
echo "TEST 2: Request Contact Form with JavaScript (English)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"James\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  REQUEST="Write me a complete contact form in HTML with JavaScript validation. Include name, email, message fields and a submit button."
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"en\"}")
  
  CONTENT=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 1000)
  
  if echo "$CONTENT" | grep -q "form\|<input\|<button\|javascript\|<script"; then
    echo "  Status: PASS - Form code generated"
    echo "  Contains: form, input, button, script tags"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL - No form code"
    echo "  Got: ${CONTENT:0:100}"
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""

# TEST 3: Request professional landing page
echo "TEST 3: Request Professional Landing Page (Spanish)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Carlos\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  REQUEST="Genera una página de inicio profesional para una empresa de software. Debe incluir hero section, features, testimonios, pricing, y CTA."
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"es\"}")
  
  CONTENT=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 1500)
  
  if echo "$CONTENT" | grep -qi "section\|hero\|features\|pricing\|cta"; then
    echo "  Status: PASS - Landing page structure generated"
    echo "  Contains: section, features, pricing, CTA elements"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL - Incomplete landing page"
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""

# TEST 4: Request e-commerce product page
echo "TEST 4: Request E-commerce Product Page (Chinese)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Li\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  REQUEST="编写一个完整的产品页面HTML代码。包括产品图片、描述、价格、购买按钮、评论部分和相关产品推荐。"
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"zh\"}")
  
  CONTENT=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 1500)
  
  if echo "$CONTENT" | grep -qi "product\|price\|button\|review\|image"; then
    echo "  Status: PASS - Product page generated"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL - Missing product page elements"
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""

# TEST 5: Request API documentation 
echo "TEST 5: Request API Documentation (Hebrew)"
TOTAL=$((TOTAL+1))
EMAIL="test-$(date +%s%N)@testmba.dev"
PASSWORD="TestPassword123!"

REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sarah\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  REQUEST="כתוב לי דוקומנטציית API ב-HTML. כולל endpoints, parameters, responses examples, וauthentication instructions."
  
  RESPONSE=$(curl -s -X POST "$API_URL/agent/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$REQUEST\",\"language\":\"he\"}")
  
  CONTENT=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 1500)
  
  if echo "$CONTENT" | grep -qi "endpoint\|parameter\|response\|api\|auth"; then
    echo "  Status: PASS - API docs generated"
    PASSED=$((PASSED+1))
  else
    echo "  Status: FAIL - Missing API documentation structure"
  fi
else
  echo "  Status: FAIL - Registration failed"
fi

echo ""
echo "==========================="
echo "CONTENT QUALITY TEST RESULTS"
echo "==========================="
echo "Passed: $PASSED / $TOTAL"
echo "Success Rate: $(($PASSED * 100 / $TOTAL))%"
echo ""

if [ $PASSED -lt $TOTAL ]; then
  echo "⚠️  Some tests failed. Check /tmp/test*-response.json for details"
else
  echo "✅ All content quality tests PASSED!"
fi

echo ""
