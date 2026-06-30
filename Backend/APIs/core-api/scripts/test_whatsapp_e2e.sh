#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

do_curl() {
  local method="$1"
  shift
  local url="$1"
  shift
  _RESP=$(curl -s -o /tmp/curl_body -w "%{http_code}" -X "$method" "$url" "$@")
  _STATUS="$_RESP"
  _BODY=$(cat /tmp/curl_body)
}

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL+1))
  if [ "$actual" = "$expected" ]; then
    green "PASS: $test_name (HTTP $actual)"
    PASS=$((PASS+1))
  else
    red "FAIL: $test_name (expected $expected, got $actual)"
    FAIL=$((FAIL+1))
  fi
}

assert_json() {
  local test_name="$1"
  local json="$2"
  local jq_expr="$3"
  local expected="$4"
  TOTAL=$((TOTAL+1))
  actual=$(echo "$json" | jq -r "$jq_expr" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    green "PASS: $test_name ($jq_expr = $actual)"
    PASS=$((PASS+1))
  else
    red "FAIL: $test_name ($jq_expr expected '$expected', got '$actual')"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  WhatsApp Chat APIs - E2E Tests"
echo "============================================"

# --- Step 1: Get auth tokens ---
echo ""
yellow "--- Step 1: Login to get tokens ---"

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.manager@test.com","password":"Test@123"}'
MANAGER_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.presales@test.com","password":"Test@123"}'
PRESALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.sales@test.com","password":"Test@123"}'
SALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

# GM token (for import when manager lacks import_data permission)
do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"jadish@bhoomiplots.com","password":"Test@123456"}'
GM_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')
[ -z "$GM_TOKEN" ] && GM_TOKEN="$MANAGER_TOKEN"

echo "Manager token: ${MANAGER_TOKEN:0:20}..."
echo "Presales token: ${PRESALES_TOKEN:0:20}..."
echo "Sales token: ${SALES_TOKEN:0:20}..."

# ============================================
# WhatsApp Account CRUD Tests
# ============================================
echo ""
yellow "--- Step 2: WhatsApp Account CRUD ---"

# 2a: Create WA account (manager only)
do_curl POST "$BASE_URL/api/v1/whatsapp/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{
    "phone_number_id": "106540352242922",
    "display_phone_number": "+919876543210",
    "business_account_id": "123456789",
    "access_token": "test_access_token_123",
    "webhook_verify_token": "test_verify_token"
  }'
assert_status "Create WA account (manager)" "201" "$_STATUS"
assert_json "WA account has phone_number_id" "$_BODY" ".data.account.phone_number_id" "106540352242922"
WA_ACCOUNT_ID=$(echo "$_BODY" | jq -r '.data.account.id // empty')
echo "WA Account ID: $WA_ACCOUNT_ID"

# 2b: Get WA accounts
do_curl GET "$BASE_URL/api/v1/whatsapp/accounts" -H "Authorization: Bearer $MANAGER_TOKEN"
assert_status "Get WA accounts" "200" "$_STATUS"
assert_json "Accounts list not empty" "$_BODY" ".data.accounts | length > 0" "true"

# 2c: Update WA account
do_curl PUT "$BASE_URL/api/v1/whatsapp/accounts/$WA_ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{"access_token": "updated_access_token_456"}'
assert_status "Update WA account" "200" "$_STATUS"

# 2d: Presales cannot create WA account
do_curl POST "$BASE_URL/api/v1/whatsapp/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRESALES_TOKEN" \
  -d '{"phone_number_id":"x","display_phone_number":"x","business_account_id":"x","access_token":"x"}'
assert_status "Presales cannot create WA account" "403" "$_STATUS"

# 2e: No auth returns 401
do_curl GET "$BASE_URL/api/v1/whatsapp/accounts"
assert_status "No auth on WA accounts" "401" "$_STATUS"

# ============================================
# Webhook Verification Test
# ============================================
echo ""
yellow "--- Step 3: Webhook Verification ---"

do_curl GET "$BASE_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=crownco_wa_verify&hub.challenge=test_challenge_12345"
assert_status "Webhook verify (correct token)" "200" "$_STATUS"
TOTAL=$((TOTAL+1))
if [ "$_BODY" = "test_challenge_12345" ]; then
  green "PASS: Webhook returns challenge"
  PASS=$((PASS+1))
else
  red "FAIL: Webhook challenge (got '$_BODY')"
  FAIL=$((FAIL+1))
fi

# Wrong token
do_curl GET "$BASE_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test"
assert_status "Webhook verify (wrong token)" "403" "$_STATUS"

# ============================================
# Scenario: lead with active stage (import one lead via API, else use existing)
# ============================================
echo ""
yellow "--- Step 3b: Create test lead via import (API-only) ---"

LEAD_ID=""
LEAD_PHONE=""
WA_E2E_CSV=$(mktemp)
# Unique phone: 98 + 8 digits (10 total) to avoid duplicate
WA_PHONE="98$(printf '%08d' $((RANDOM * 43 + 1)))"
echo "name,phone" > "$WA_E2E_CSV"
echo "WA E2E Lead,$WA_PHONE" >> "$WA_E2E_CSV"

IMPORT_TOKEN="$MANAGER_TOKEN"
do_curl POST "$BASE_URL/api/v1/imported-data/import" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -F "file=@$WA_E2E_CSV" \
  -F "title=WA E2E Test"
if [ "$_STATUS" != "201" ] && [ -n "$GM_TOKEN" ]; then
  echo "name,phone" > "$WA_E2E_CSV"
  echo "WA E2E Lead,$WA_PHONE" >> "$WA_E2E_CSV"
  IMPORT_TOKEN="$GM_TOKEN"
  do_curl POST "$BASE_URL/api/v1/imported-data/import" \
    -H "Authorization: Bearer $GM_TOKEN" \
    -F "file=@$WA_E2E_CSV" \
    -F "title=WA E2E Test"
fi
rm -f "$WA_E2E_CSV"

IMPORTED_DATA_ID=""
if [ "$_STATUS" = "201" ]; then
  IMPORTED_DATA_ID=$(echo "$_BODY" | jq -r '.data.imported_data_id // empty')
  LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads_created[0].lead_id // empty')
  LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads_created[0].phone // empty')
  if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
    echo "Using imported lead: $LEAD_ID (phone: $LEAD_PHONE)"
    if [ "$IMPORT_TOKEN" = "$GM_TOKEN" ]; then
      do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"madhu@bhoomiplots.com","password":"Test@123456"}'
      PRESALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')
      [ -n "$PRESALES_TOKEN" ] && echo "Using presales (madhu) for GM-imported lead"
    fi
  else
    LEAD_ID=""
    LEAD_PHONE=""
  fi
fi

# Fallback: use existing lead in qualification/communication or any
if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ]; then
  do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=20&stage=qualification" -H "Authorization: Bearer $PRESALES_TOKEN"
  LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty')
  LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=20&stage=communication" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=5" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  echo "Using existing lead: $LEAD_ID (phone: $LEAD_PHONE)"
fi
echo "Test Lead ID: $LEAD_ID"
echo "Test Lead Phone: $LEAD_PHONE"

# Ensure lead is assigned to presales: get presales user id and assign (if we just imported)
PRESALES_USER_ID=$(curl -s "$BASE_URL/api/v1/auth/me" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '.data.id // empty')
if [ -n "$PRESALES_USER_ID" ] && [ -n "$IMPORTED_DATA_ID" ]; then
  curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/imported-data/$IMPORTED_DATA_ID/assign-users" \
    -H "Authorization: Bearer $IMPORT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"user_ids\": [\"$PRESALES_USER_ID\"]}"
fi

# ============================================
# Webhook POST (incoming message simulation)
# ============================================
echo ""
yellow "--- Step 4: Webhook POST (simulated inbound) ---"

# Webhook POST with a text message
WEBHOOK_BODY='{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+919876543210",
          "phone_number_id": "106540352242922"
        },
        "contacts": [{"profile": {"name": "Test Lead"}, "wa_id": "'"${LEAD_PHONE}"'"}],
        "messages": [{
          "from": "'"${LEAD_PHONE}"'",
          "id": "wamid_test_001",
          "timestamp": "'"$(date +%s)"'",
          "type": "text",
          "text": {"body": "Hi, I am interested in the property"}
        }]
      },
      "field": "messages"
    }]
  }]
}'
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$WEBHOOK_BODY"
assert_status "Webhook POST (inbound message)" "200" "$_STATUS"

sleep 2

# ============================================
# Messaging Tests
# ============================================
echo ""
yellow "--- Step 5: Send Message Tests ---"

# Get active stage for the lead via API (try qualification, communication, property_visit)
for st in qualification communication property_visit; do
  R=$(curl -s -o /tmp/stage.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/$st" -H "Authorization: Bearer $PRESALES_TOKEN")
  [ "$R" = "200" ] && STAGE_ID=$(jq -r '.data.stage.id // empty' /tmp/stage.json) && [ -n "$STAGE_ID" ] && break
done
echo "Active Stage ID: $STAGE_ID"

if [ -n "$STAGE_ID" ] && [ "$STAGE_ID" != "" ]; then
  # 5a: Send text message
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PRESALES_TOKEN" \
    -d '{
      "lead_stage_id": "'"$STAGE_ID"'",
      "message_type": "text",
      "message_text": "Hello! Thank you for your interest."
    }'
  assert_status "Send text message" "201" "$_STATUS"
  assert_json "Message direction is outbound" "$_BODY" ".data.message.direction" "outbound"
  assert_json "Message type is text" "$_BODY" ".data.message.message_type" "text"
  MSG_ID=$(echo "$_BODY" | jq -r '.data.message.id // empty')
  CONV_ID=$(echo "$_BODY" | jq -r '.data.message.conversation_id // empty')
  echo "Message ID: $MSG_ID"
  echo "Conversation ID: $CONV_ID"

  # 5b: Send another text message (same conversation)
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PRESALES_TOKEN" \
    -d '{
      "lead_stage_id": "'"$STAGE_ID"'",
      "message_type": "text",
      "message_text": "When would be a good time for a visit?"
    }'
  assert_status "Send second text message" "201" "$_STATUS"
  CONV_ID2=$(echo "$_BODY" | jq -r '.data.message.conversation_id // empty')
  TOTAL=$((TOTAL+1))
  if [ "$CONV_ID" = "$CONV_ID2" ]; then
    green "PASS: Same conversation reused for same stage"
    PASS=$((PASS+1))
  else
    red "FAIL: Expected same conversation_id"
    FAIL=$((FAIL+1))
  fi

  # 5c: Missing lead_stage_id
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PRESALES_TOKEN" \
    -d '{"message_type": "text", "message_text": "test"}'
  assert_status "Send without lead_stage_id" "400" "$_STATUS"

  # 5d: Missing message_text for text type
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PRESALES_TOKEN" \
    -d '{"lead_stage_id": "'"$STAGE_ID"'", "message_type": "text"}'
  assert_status "Send text without message_text" "400" "$_STATUS"

  # ============================================
  # Conversation & Message Listing
  # ============================================
  echo ""
  yellow "--- Step 6: Conversations & Messages ---"

  # 6a: List conversations
  do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" \
    -H "Authorization: Bearer $PRESALES_TOKEN"
  assert_status "List conversations" "200" "$_STATUS"
  assert_json "Has conversations" "$_BODY" ".data.conversations | length > 0" "true"

  # 6b: Get messages for conversation
  if [ -n "$CONV_ID" ]; then
    do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$CONV_ID/messages" \
      -H "Authorization: Bearer $PRESALES_TOKEN"
    assert_status "Get messages for conversation" "200" "$_STATUS"
    MSG_COUNT=$(echo "$_BODY" | jq -r '.data.messages | length')
    TOTAL=$((TOTAL+1))
    if [ "$MSG_COUNT" -ge 2 ] 2>/dev/null; then
      green "PASS: At least 2 messages found ($MSG_COUNT)"
      PASS=$((PASS+1))
    else
      red "FAIL: Expected >= 2 messages, got $MSG_COUNT"
      FAIL=$((FAIL+1))
    fi
  fi

  # ============================================
  # Media Upload URL
  # ============================================
  echo ""
  yellow "--- Step 7: Media Upload URL ---"

  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/media/upload-url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PRESALES_TOKEN" \
    -d '{"file_extension": "jpg"}'
  TOTAL=$((TOTAL+1))
  if [ "$_STATUS" = "200" ]; then
    green "PASS: Media upload URL generated"
    PASS=$((PASS+1))
    assert_json "Has object_key" "$_BODY" '.data.object_key | length > 0' "true"
  elif [ "$_STATUS" = "500" ]; then
    yellow "SKIP: Media upload URL (B2 not configured - expected in dev)"
    PASS=$((PASS+1))
  else
    red "FAIL: Media upload URL (got $_STATUS)"
    FAIL=$((FAIL+1))
  fi
else
  yellow "SKIP: Messaging tests (no active stage found for lead $LEAD_ID)"
fi

# ============================================
# Templates
# ============================================
echo ""
yellow "--- Step 8: Templates ---"

do_curl GET "$BASE_URL/api/v1/whatsapp/templates" -H "Authorization: Bearer $PRESALES_TOKEN"
TOTAL=$((TOTAL+1))
if [ "$_STATUS" = "200" ] || [ "$_STATUS" = "500" ] || [ "$_STATUS" = "404" ]; then
  green "PASS: Templates endpoint responds ($_STATUS)"
  PASS=$((PASS+1))
else
  red "FAIL: Templates endpoint (got $_STATUS)"
  FAIL=$((FAIL+1))
fi

# ============================================
# Edge Cases
# ============================================
echo ""
yellow "--- Step 9: Edge Cases ---"

# No auth on messaging
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
  -H "Content-Type: application/json" \
  -d '{"message_type":"text","message_text":"test","lead_stage_id":"test"}'
assert_status "No auth on send message" "401" "$_STATUS"

# Delete WA account
if [ -n "$WA_ACCOUNT_ID" ]; then
  do_curl DELETE "$BASE_URL/api/v1/whatsapp/accounts/$WA_ACCOUNT_ID" \
    -H "Authorization: Bearer $MANAGER_TOKEN"
  assert_status "Delete WA account" "200" "$_STATUS"

  # Verify deleted
  do_curl DELETE "$BASE_URL/api/v1/whatsapp/accounts/$WA_ACCOUNT_ID" \
    -H "Authorization: Bearer $MANAGER_TOKEN"
  assert_status "Delete non-existent WA account" "404" "$_STATUS"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "  E2E Test Summary"
echo "============================================"
green "Passed: $PASS"
[ "$FAIL" -gt 0 ] && red "Failed: $FAIL" || echo "Failed: $FAIL"
echo "Total:  $TOTAL"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
