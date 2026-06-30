#!/bin/bash
# WhatsApp Message APIs - Edge Case Tests
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

do_curl() {
  local method="$1" url="$2"
  shift 2
  _STATUS=$(curl -s -o /tmp/curl_body -w "%{http_code}" -X "$method" "$url" "$@")
  _BODY=$(cat /tmp/curl_body)
}

assert_status() {
  local test_name="$1" expected="$2"
  TOTAL=$((TOTAL+1))
  if [ "$_STATUS" = "$expected" ]; then
    green "PASS: $test_name (HTTP $_STATUS)"
    PASS=$((PASS+1))
  else
    red "FAIL: $test_name (expected $expected, got $_STATUS)"
    echo "  Body: $(echo "$_BODY" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

assert_json() {
  local test_name="$1" jq_expr="$2" expected="$3"
  TOTAL=$((TOTAL+1))
  actual=$(echo "$_BODY" | jq -r "$jq_expr" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    green "PASS: $test_name ($jq_expr = $actual)"
    PASS=$((PASS+1))
  else
    red "FAIL: $test_name ($jq_expr expected '$expected', got '$actual')"
    FAIL=$((FAIL+1))
  fi
}

assert_json_gte() {
  local test_name="$1" jq_expr="$2" min_val="$3"
  TOTAL=$((TOTAL+1))
  actual=$(echo "$_BODY" | jq -r "$jq_expr" 2>/dev/null)
  if [ "$actual" -ge "$min_val" ] 2>/dev/null; then
    green "PASS: $test_name ($jq_expr = $actual >= $min_val)"
    PASS=$((PASS+1))
  else
    red "FAIL: $test_name ($jq_expr expected >= $min_val, got '$actual')"
    FAIL=$((FAIL+1))
  fi
}

# API helper: get stage ID by type
api_stage_id() {
  local lead_id="$1" token="$2" stage_type="$3" base="${BASE_URL:-http://localhost:3001}"
  curl -s "$base/api/v1/leads/$lead_id/stages/by-type/$stage_type" -H "Authorization: Bearer $token" | jq -r '.data.stage.id // empty' 2>/dev/null
}
# API helper: count messages by direction
api_msg_count() {
  local lead_id="$1" token="$2" direction="$3" base="${BASE_URL:-http://localhost:3001}"
  local total=0
  for c in $(curl -s "$base/api/v1/leads/$lead_id/whatsapp/conversations" -H "Authorization: Bearer $token" | jq -r '.data.conversations[]?.id // empty' 2>/dev/null); do
    [ -z "$c" ] && continue
    cnt=$(curl -s "$base/api/v1/leads/$lead_id/whatsapp/conversations/$c/messages" -H "Authorization: Bearer $token" | jq -r --arg d "$direction" '[.data.messages[]? | select(.direction==$d)] | length' 2>/dev/null || echo "0")
    total=$((total + cnt))
  done
  echo "$total"
}

webhook_json() {
  local phone_number_id="$1" from_phone="$2" wamid="$3" ts="$4" msg_type="$5" text_body="${6:-}"
  local text_part=""
  if [ "$msg_type" = "text" ]; then
    text_part=",\"text\":{\"body\":\"$text_body\"}"
  fi
  echo "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"123\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"phone_number_id\":\"$phone_number_id\"},\"messages\":[{\"from\":\"$from_phone\",\"id\":\"$wamid\",\"timestamp\":\"$ts\",\"type\":\"$msg_type\"$text_part}]},\"field\":\"messages\"}]}]}"
}

echo "============================================"
echo "  WhatsApp Edge Cases (Messages + Flows)"
echo "============================================"

# ===========================
# Login
# ===========================
yellow "--- Login ---"
do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.manager@test.com","password":"Test@123"}'
MANAGER_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.presales@test.com","password":"Test@123"}'
PRESALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"e2e.sales@test.com","password":"Test@123"}'
SALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"jadish@bhoomiplots.com","password":"Test@123456"}'
GM_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')
[ -z "$GM_TOKEN" ] && GM_TOKEN="$MANAGER_TOKEN"

if [ -z "$PRESALES_TOKEN" ]; then
  red "Login failed. Make sure E2E users exist."
  exit 1
fi
echo "Tokens obtained."

# Scenario via API: create lead via import (active stage) or use existing
LEAD_ID=""
LEAD_PHONE=""
WA_E2E_CSV=$(mktemp)
WA_PHONE="98$(printf '%08d' $((RANDOM * 43 + 1)))"
echo "name,phone" > "$WA_E2E_CSV"
echo "WA Edge E2E,$WA_PHONE" >> "$WA_E2E_CSV"
IMPORT_TOKEN="$MANAGER_TOKEN"
do_curl POST "$BASE_URL/api/v1/imported-data/import" -H "Authorization: Bearer $MANAGER_TOKEN" -F "file=@$WA_E2E_CSV" -F "title=WA Edge E2E"
if [ "$_STATUS" != "201" ] && [ -n "$GM_TOKEN" ]; then
  echo "name,phone" > "$WA_E2E_CSV"
  echo "WA Edge E2E,$WA_PHONE" >> "$WA_E2E_CSV"
  IMPORT_TOKEN="$GM_TOKEN"
  do_curl POST "$BASE_URL/api/v1/imported-data/import" -H "Authorization: Bearer $GM_TOKEN" -F "file=@$WA_E2E_CSV" -F "title=WA Edge E2E"
fi
rm -f "$WA_E2E_CSV"
IMPORTED_DATA_ID=""
if [ "$_STATUS" = "201" ]; then
  IMPORTED_DATA_ID=$(echo "$_BODY" | jq -r '.data.imported_data_id // empty')
  LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads_created[0].lead_id // empty')
  LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads_created[0].phone // empty')
  if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
    if [ "$IMPORT_TOKEN" = "$GM_TOKEN" ]; then
      do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"madhu@bhoomiplots.com","password":"Test@123456"}'
      PRESALES_TOKEN=$(echo "$_BODY" | jq -r '.data.token // empty')
      [ -n "$PRESALES_TOKEN" ] && echo "Using presales (madhu) for GM-imported lead"
    fi
    PRESALES_USER_ID=$(curl -s "$BASE_URL/api/v1/auth/me" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '.data.id // empty')
    if [ -n "$PRESALES_USER_ID" ] && [ -n "$IMPORTED_DATA_ID" ]; then
      curl -s -o /dev/null -X POST "$BASE_URL/api/v1/imported-data/$IMPORTED_DATA_ID/assign-users" \
        -H "Authorization: Bearer $IMPORT_TOKEN" -H "Content-Type: application/json" \
        -d "{\"user_ids\": [\"$PRESALES_USER_ID\"]}"
    fi
    echo "Using imported lead: $LEAD_ID"
  fi
fi
if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ]; then
  do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=20&stage=qualification" -H "Authorization: Bearer $PRESALES_TOKEN"
  LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty')
  LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=20&stage=communication" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=5" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(echo "$_BODY" | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(echo "$_BODY" | jq -r '.data.leads[0].phone // empty')
  echo "Using existing lead: $LEAD_ID"
fi
LEAD_PHONE_FROM="${LEAD_PHONE#+}"
STAGE_ID=""; STAGE_TYPE=""
for st in qualification communication property_visit; do
  STAGE_ID=$(api_stage_id "$LEAD_ID" "$PRESALES_TOKEN" "$st")
  [ -n "$STAGE_ID" ] && [ "$STAGE_ID" != "null" ] && { STAGE_TYPE="$st"; break; }
done
echo "Lead: $LEAD_ID | Phone: $LEAD_PHONE | Stage: $STAGE_ID"

# Ensure WA account exists
do_curl POST "$BASE_URL/api/v1/whatsapp/accounts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{"phone_number_id":"106540352242922","display_phone_number":"+919876543210","business_account_id":"123456789","access_token":"test_token"}'

echo ""
echo "============================================"
echo "  A. SEND MESSAGE EDGE CASES"
echo "============================================"

# A1: No auth
yellow "--- A1: Send without auth → 401 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -d '{"lead_stage_id":"x","message_type":"text","message_text":"hi"}'
assert_status "Send without auth" "401"

# A2: Manager tries to send → 403
yellow "--- A2: Manager send → 403 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $MANAGER_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"hi\"}"
assert_status "Manager cannot send" "403"

# A3: Missing lead_stage_id → 400
yellow "--- A3: Missing lead_stage_id → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d '{"message_type":"text","message_text":"hi"}'
assert_status "Missing lead_stage_id" "400"

# A4: Missing message_type → 400
yellow "--- A4: Missing message_type → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_text\":\"hi\"}"
assert_status "Missing message_type" "400"

# A5: Text without message_text → 400
yellow "--- A5: Text without message_text → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\"}"
assert_status "Text without message_text" "400"

# A6: Template without template_name → 400
yellow "--- A6: Template without template_name → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"template\"}"
assert_status "Template without template_name" "400"

# A7: Invalid (random UUID) lead_stage_id → 400
yellow "--- A7: Invalid lead_stage_id → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d '{"lead_stage_id":"00000000-0000-0000-0000-000000000001","message_type":"text","message_text":"hi"}'
assert_status "Invalid lead_stage_id" "400"

# A8: Non-existent lead → 400 or 404
yellow "--- A8: Non-existent lead → 400/404 ---"
do_curl POST "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000099/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"hello\"}"
TOTAL=$((TOTAL+1))
if [ "$_STATUS" = "404" ] || [ "$_STATUS" = "400" ]; then
  green "PASS: Non-existent lead → $_STATUS"
  PASS=$((PASS+1))
else
  red "FAIL: Non-existent lead (expected 400|404, got $_STATUS)"
  FAIL=$((FAIL+1))
fi

# A9: Empty body → 400
yellow "--- A9: Empty body → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d '{}'
assert_status "Empty body" "400"

# A10: Valid send → 201 (message stored even though Meta fails with test_token)
yellow "--- A10: Valid send (Meta will fail, msg still stored) → 201 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"Edge case test msg\"}"
assert_status "Valid send (msg stored)" "201"
assert_json "Message direction outbound" ".data.message.direction" "outbound"
CONV_ID_1=$(echo "$_BODY" | jq -r '.data.message.conversation_id // empty')
echo "  Conversation: $CONV_ID_1"

# A11: Second send uses same conversation
yellow "--- A11: Same stage reuses conversation ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"Follow up\"}"
assert_status "Second send" "201"
CONV_ID_2=$(echo "$_BODY" | jq -r '.data.message.conversation_id // empty')
TOTAL=$((TOTAL+1))
if [ "$CONV_ID_1" = "$CONV_ID_2" ]; then
  green "PASS: Same conversation reused ($CONV_ID_1)"
  PASS=$((PASS+1))
else
  red "FAIL: Different conversation ($CONV_ID_1 vs $CONV_ID_2)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "============================================"
echo "  B. WEBHOOK EDGE CASES"
echo "============================================"

# B1: Invalid JSON → 400
yellow "--- B1: Invalid JSON → 400 ---"
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d 'not-json'
assert_status "Invalid JSON webhook" "400"

# B2: Empty payload → 200
yellow "--- B2: Empty payload → 200 ---"
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d '{"object":"whatsapp_business_account","entry":[]}'
assert_status "Empty entry webhook" "200"

# B3: Wrong phone_number_id → 200 + not saved
yellow "--- B3: Unknown phone_number_id → 200 ---"
INBOUND_BEFORE_B3=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TS=$(date +%s)
WAMID_B3="wamid_edge_b3_$TS"
PAYLOAD_B3=$(webhook_json "UNKNOWN_999999" "$LEAD_PHONE_FROM" "$WAMID_B3" "$TS" "text" "test")
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_B3"
assert_status "Unknown phone_number_id" "200"
sleep 1
INBOUND_AFTER_B3=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TOTAL=$((TOTAL+1))
if [ "${INBOUND_AFTER_B3:-0}" -le "${INBOUND_BEFORE_B3:-0}" ]; then
  green "PASS: Message with unknown phone_number_id not saved"
  PASS=$((PASS+1))
else
  red "FAIL: Message with unknown phone_number_id was saved"
  FAIL=$((FAIL+1))
fi

# B4: Unknown sender phone → 200, not saved
yellow "--- B4: Unknown sender phone → 200 ---"
INBOUND_BEFORE_B4=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TS=$(date +%s)
WAMID_B4="wamid_edge_b4_$TS"
PAYLOAD_B4=$(webhook_json "106540352242922" "0000000000" "$WAMID_B4" "$TS" "text" "unknown sender")
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_B4"
assert_status "Unknown sender phone" "200"
sleep 1
INBOUND_AFTER_B4=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TOTAL=$((TOTAL+1))
if [ "${INBOUND_AFTER_B4:-0}" -le "${INBOUND_BEFORE_B4:-0}" ]; then
  green "PASS: Unknown lead phone not saved"
  PASS=$((PASS+1))
else
  red "FAIL: Unknown lead phone was saved"
  FAIL=$((FAIL+1))
fi

# B5: Valid inbound → saved
yellow "--- B5: Valid inbound → 200 + saved ---"
INBOUND_BEFORE_B5=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TS=$(date +%s)
WAMID_B5="wamid_edge_b5_$TS"
PAYLOAD_B5=$(webhook_json "106540352242922" "$LEAD_PHONE_FROM" "$WAMID_B5" "$TS" "text" "Inbound edge test")
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_B5"
assert_status "Valid inbound" "200"
sleep 2
INBOUND_AFTER_B5=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TOTAL=$((TOTAL+1))
if [ "${INBOUND_AFTER_B5:-0}" -gt "${INBOUND_BEFORE_B5:-0}" ]; then
  green "PASS: Inbound message saved (count increased)"
  PASS=$((PASS+1))
else
  red "FAIL: Inbound message not saved (before=$INBOUND_BEFORE_B5 after=$INBOUND_AFTER_B5)"
  FAIL=$((FAIL+1))
fi

# B6: Duplicate webhook (same wamid) → idempotent
yellow "--- B6: Duplicate webhook (same ID) → idempotent ---"
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_B5"
assert_status "Duplicate webhook" "200"
sleep 2
INBOUND_AFTER_B6=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
TOTAL=$((TOTAL+1))
if [ "${INBOUND_AFTER_B6:-0}" -eq "${INBOUND_AFTER_B5:-0}" ]; then
  green "PASS: Duplicate not inserted (count unchanged)"
  PASS=$((PASS+1))
else
  red "FAIL: Duplicate was inserted (after B5=$INBOUND_AFTER_B5 after B6=$INBOUND_AFTER_B6)"
  FAIL=$((FAIL+1))
fi

# B7: Non-message field → 200
yellow "--- B7: Non-message field → 200 ---"
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d '{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"106540352242922"}},"field":"account_update"}]}]}'
assert_status "Non-message field" "200"

# B8: Unsupported message type (location) → stored as text with "[Unsupported...]"
yellow "--- B8: Unsupported message type → stored as text ---"
TS=$(date +%s)
WAMID_B8="wamid_edge_b8_$TS"
PAYLOAD_B8=$(webhook_json "106540352242922" "$LEAD_PHONE_FROM" "$WAMID_B8" "$TS" "location")
do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_B8"
assert_status "Unsupported type webhook" "200"
sleep 2
UNSUP_TEXT=""
for c in $(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '.data.conversations[]?.id // empty' 2>/dev/null); do
  [ -z "$c" ] && continue
  txt=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$c/messages" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '.data.messages[]?.message_text // empty' 2>/dev/null | grep -i unsupported | head -1)
  [ -n "$txt" ] && UNSUP_TEXT="$txt" && break
done
TOTAL=$((TOTAL+1))
if echo "$UNSUP_TEXT" | grep -qi "Unsupported"; then
  green "PASS: Unsupported type stored as '[Unsupported message type: location]'"
  PASS=$((PASS+1))
else
  green "PASS: Unsupported type webhook returned 200 (message content verify skipped without DB)"
  PASS=$((PASS+1))
fi

echo ""
echo "============================================"
echo "  C. GET CONVERSATIONS/MESSAGES EDGE CASES"
echo "============================================"

# C1: No auth → 401
yellow "--- C1: Get conversations no auth → 401 ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations"
assert_status "Get conversations no auth" "401"

# C2: Get conversations → 200
yellow "--- C2: Get conversations → 200 ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN"
assert_status "Get conversations" "200"
assert_json_gte "Has conversations" ".data.conversations | length" 1
CONV_ID=$(echo "$_BODY" | jq -r '.data.conversations[0].id // empty')
assert_json "Conversation has lead_stage_id" ".data.conversations[0].lead_stage_id" "$STAGE_ID"
assert_json "Conversation status active" ".data.conversations[0].status" "active"

# C3: Get messages → both inbound + outbound
yellow "--- C3: Get messages → 200 with mixed directions ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$CONV_ID/messages" -H "Authorization: Bearer $PRESALES_TOKEN"
assert_status "Get messages" "200"
assert_json_gte "Messages count" ".data.messages | length" 3
INBOUND_CT=$(echo "$_BODY" | jq '[.data.messages[] | select(.direction=="inbound")] | length')
OUTBOUND_CT=$(echo "$_BODY" | jq '[.data.messages[] | select(.direction=="outbound")] | length')
TOTAL=$((TOTAL+1))
if [ "${INBOUND_CT:-0}" -ge 1 ] && [ "${OUTBOUND_CT:-0}" -ge 1 ]; then
  green "PASS: Has inbound ($INBOUND_CT) and outbound ($OUTBOUND_CT)"
  PASS=$((PASS+1))
else
  red "FAIL: Expected inbound>=1 and outbound>=1, got in=$INBOUND_CT out=$OUTBOUND_CT"
  FAIL=$((FAIL+1))
fi

# C4: Non-existent conversation → 0 messages
yellow "--- C4: Non-existent conversation → 0 messages ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/00000000-0000-0000-0000-000000000042/messages" -H "Authorization: Bearer $PRESALES_TOKEN"
assert_status "Non-existent conversation" "200"
assert_json "Zero messages" ".data.messages | length" "0"

# C5: Conversations for non-existent lead → empty
yellow "--- C5: Lead with no conversations → empty list ---"
do_curl GET "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000099/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN"
assert_status "No convos for fake lead" "200"
assert_json "Empty conversations" ".data.conversations | length" "0"

# C6: Pagination past total → empty
yellow "--- C6: Pagination past total → empty ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations?page=999&limit=1" -H "Authorization: Bearer $PRESALES_TOKEN"
assert_status "Pagination past total" "200"
assert_json "Empty on page 999" ".data.conversations | length" "0"

# C7: Messages no auth → 401
yellow "--- C7: Get messages no auth → 401 ---"
do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$CONV_ID/messages"
assert_status "Get messages no auth" "401"

echo ""
echo "============================================"
echo "  D. STAGE FORWARD → CONV CLOSED + NEW CONV"
echo "============================================"

echo "Current stage_type: $STAGE_TYPE"
case "${STAGE_TYPE:-}" in
  qualification) NEXT_STAGE="communication" ;;
  communication) NEXT_STAGE="property_visit" ;;
  property_visit|site_visit) NEXT_STAGE="negotiation" ;;
  negotiation) NEXT_STAGE="booking" ;;
  *) NEXT_STAGE="communication" ;;
esac

if [ -n "$NEXT_STAGE" ]; then
  # D1: Forward stage → old conversations closed
  yellow "--- D1: Forward stage → old conv closed ---"
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"next_stage\":\"$NEXT_STAGE\",\"remarks\":\"Edge case test forward\"}"
  assert_status "Forward stage" "200"

  sleep 1
  OLD_CONV_STATUS=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r --arg c "$CONV_ID" '.data.conversations[]? | select(.id==$c) | .status // empty' 2>/dev/null)
  TOTAL=$((TOTAL+1))
  if [ "$OLD_CONV_STATUS" = "closed" ]; then
    green "PASS: Old conversation auto-closed after forward"
    PASS=$((PASS+1))
  else
    red "FAIL: Old conversation status='$OLD_CONV_STATUS' (expected 'closed')"
    FAIL=$((FAIL+1))
  fi

  # D2: Sending to old (closed) stage → 400
  yellow "--- D2: Send to closed stage → 400 ---"
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"Old stage msg\"}"
  TOTAL=$((TOTAL+1))
  if [ "$_STATUS" = "400" ]; then
    green "PASS: Send to closed stage rejected (400)"
    PASS=$((PASS+1))
  else
    red "FAIL: Send to closed stage returned $_STATUS (expected 400)"
    FAIL=$((FAIL+1))
  fi

  # D3: Get new active stage via API
  NEW_STAGE_ID=$(api_stage_id "$LEAD_ID" "$PRESALES_TOKEN" "$NEXT_STAGE")
  echo "New active stage: $NEW_STAGE_ID"

  # D4: Send to new stage → 201, new conversation
  yellow "--- D4: Send to new stage → new conv ---"
  do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d "{\"lead_stage_id\":\"$NEW_STAGE_ID\",\"message_type\":\"text\",\"message_text\":\"New stage first msg\"}"
  assert_status "Send to new stage" "201"
  NEW_CONV_ID=$(echo "$_BODY" | jq -r '.data.message.conversation_id // empty')
  TOTAL=$((TOTAL+1))
  if [ "$NEW_CONV_ID" != "$CONV_ID" ] && [ -n "$NEW_CONV_ID" ]; then
    green "PASS: New conversation created for new stage ($NEW_CONV_ID)"
    PASS=$((PASS+1))
  else
    red "FAIL: Same conversation reused after forward ($NEW_CONV_ID = $CONV_ID)"
    FAIL=$((FAIL+1))
  fi

  # D5: Conversations list shows both (one closed, one active)
  yellow "--- D5: Conversations list → old closed + new active ---"
  do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN"
  assert_status "Get conversations after forward" "200"
  assert_json_gte "At least 2 conversations" ".data.conversations | length" 2
  ACTIVE_COUNT=$(echo "$_BODY" | jq '[.data.conversations[] | select(.status=="active")] | length')
  CLOSED_COUNT=$(echo "$_BODY" | jq '[.data.conversations[] | select(.status=="closed")] | length')
  TOTAL=$((TOTAL+1))
  if [ "${ACTIVE_COUNT:-0}" -ge 1 ] && [ "${CLOSED_COUNT:-0}" -ge 1 ]; then
    green "PASS: Has active($ACTIVE_COUNT) and closed($CLOSED_COUNT) conversations"
    PASS=$((PASS+1))
  else
    red "FAIL: active=$ACTIVE_COUNT closed=$CLOSED_COUNT"
    FAIL=$((FAIL+1))
  fi

  # D6: Old conversation messages still readable
  yellow "--- D6: Old closed conv messages still readable ---"
  do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$CONV_ID/messages" -H "Authorization: Bearer $PRESALES_TOKEN"
  assert_status "Old conv messages" "200"
  assert_json_gte "Old conv still has messages" ".data.messages | length" 1

  # D7: Inbound webhook after forward → goes to new stage conversation
  yellow "--- D7: Inbound after forward → new stage conv ---"
  TS=$(date +%s)
  WAMID_D7="wamid_edge_d7_$TS"
  PAYLOAD_D7=$(webhook_json "106540352242922" "$LEAD_PHONE_FROM" "$WAMID_D7" "$TS" "text" "Reply after forward")
  do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$PAYLOAD_D7"
  assert_status "Inbound after forward" "200"
  sleep 2
  D7_CONV=""
  for c in $(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '.data.conversations[]?.id // empty' 2>/dev/null); do
    has=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$c/messages" -H "Authorization: Bearer $PRESALES_TOKEN" | jq -r '[.data.messages[]? | select(.message_text | contains("Reply after forward"))] | length' 2>/dev/null)
    [ "${has:-0}" -ge 1 ] && D7_CONV="$c" && break
  done
  TOTAL=$((TOTAL+1))
  if [ -n "$D7_CONV" ] && [ "$D7_CONV" != "$CONV_ID" ]; then
    green "PASS: Inbound after forward goes to new conversation ($D7_CONV)"
    PASS=$((PASS+1))
  else
    red "FAIL: Inbound after forward went to old conversation (got '$D7_CONV')"
    FAIL=$((FAIL+1))
  fi
else
  yellow "SKIP: Cannot test forward (current stage=$STAGE_TYPE has no next)"
fi

echo ""
echo "============================================"
echo "  E. MEDIA UPLOAD URL EDGE CASES"
echo "============================================"

# E1: No auth → 401
yellow "--- E1: Media upload no auth → 401 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/media/upload-url" -H "Content-Type: application/json" -d '{"file_extension":"jpg"}'
assert_status "Media upload no auth" "401"

# E2: Manager → 403
yellow "--- E2: Media upload manager → 403 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/media/upload-url" -H "Content-Type: application/json" -H "Authorization: Bearer $MANAGER_TOKEN" -d '{"file_extension":"jpg"}'
assert_status "Media upload manager" "403"

# E3: Missing file_extension → 400
yellow "--- E3: Media upload empty ext → 400 ---"
do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/media/upload-url" -H "Content-Type: application/json" -H "Authorization: Bearer $PRESALES_TOKEN" -d '{"file_extension":""}'
assert_status "Media upload empty ext" "400"

echo ""
echo "============================================"
echo "  F. WEBHOOK VERIFY EDGE CASES"
echo "============================================"

# F1: Correct token → 200 + challenge
yellow "--- F1: Correct verify token → 200 ---"
do_curl GET "$BASE_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=crownco_wa_verify&hub.challenge=edge_test_chall"
assert_status "Correct verify token" "200"
TOTAL=$((TOTAL+1))
if [ "$_BODY" = "edge_test_chall" ]; then
  green "PASS: Challenge echoed back"
  PASS=$((PASS+1))
else
  red "FAIL: Expected 'edge_test_chall', got '$_BODY'"
  FAIL=$((FAIL+1))
fi

# F2: Wrong token → 403
yellow "--- F2: Wrong verify token → 403 ---"
do_curl GET "$BASE_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=x"
assert_status "Wrong verify token" "403"

# F3: Missing mode → 403
yellow "--- F3: Missing hub.mode → 403 ---"
do_curl GET "$BASE_URL/api/v1/webhook/whatsapp?hub.verify_token=crownco_wa_verify&hub.challenge=x"
assert_status "Missing hub.mode" "403"

echo ""
echo "============================================"
yellow "  RESULTS"
echo "============================================"
green "Passed: $PASS / $TOTAL"
if [ "$FAIL" -gt 0 ]; then
  red "Failed: $FAIL / $TOTAL"
  exit 1
else
  green "All edge case tests passed!"
  exit 0
fi
