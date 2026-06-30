#!/bin/bash
# Tests: webhook receives and saves messages, send works, stage-wise get works.
set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

do_curl() {
  local method="$1" url="$2"
  shift 2
  curl -s -o /tmp/curl_body -w "%{http_code}" -X "$method" "$url" "$@"
}
body() { cat /tmp/curl_body; }

# API helper: get message count by direction (no DB)
api_msg_count() {
  local lead_id="$1" token="$2" direction="$3" base="${BASE_URL:-http://localhost:3001}"
  local total=0
  convs=$(curl -s "$base/api/v1/leads/$lead_id/whatsapp/conversations" -H "Authorization: Bearer $token" | jq -r '.data.conversations[]?.id // empty' 2>/dev/null)
  for c in $convs; do
    [ -z "$c" ] && continue
    cnt=$(curl -s "$base/api/v1/leads/$lead_id/whatsapp/conversations/$c/messages" -H "Authorization: Bearer $token" | jq -r --arg d "$direction" '[.data.messages[]? | select(.direction==$d)] | length' 2>/dev/null || echo "0")
    total=$((total + cnt))
  done
  echo "$total"
}

echo "============================================"
echo "  WhatsApp: Webhook + Send + Stage-wise Get"
echo "============================================"

# 1) Login
yellow "--- 1) Login ---"
do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"e2e.manager@test.com","password":"Test@123"}' >/dev/null
MANAGER_TOKEN=$(body | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"e2e.presales@test.com","password":"Test@123"}' >/dev/null
PRESALES_TOKEN=$(body | jq -r '.data.token // empty')

do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"jadish@bhoomiplots.com","password":"Test@123456"}' >/dev/null
GM_TOKEN=$(body | jq -r '.data.token // empty')
[ -z "$GM_TOKEN" ] && GM_TOKEN="$MANAGER_TOKEN"

if [ -z "$PRESALES_TOKEN" ]; then
  red "Presales login failed. Create e2e users first (see test_whatsapp_e2e.sh)."
  exit 1
fi

# 2) Create WA account
yellow "--- 2) Create WA account ---"
STATUS=$(do_curl POST "$BASE_URL/api/v1/whatsapp/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{"phone_number_id":"106540352242922","display_phone_number":"+919876543210","business_account_id":"123456789","access_token":"test_token"}')
if [ "$STATUS" = "201" ]; then
  WA_ACCOUNT_ID=$(body | jq -r '.data.account.id // empty')
else
  do_curl GET "$BASE_URL/api/v1/whatsapp/accounts" -H "Authorization: Bearer $MANAGER_TOKEN" >/dev/null
  WA_ACCOUNT_ID=$(body | jq -r '.data.accounts[0].id // empty')
fi
echo "WA Account ID: $WA_ACCOUNT_ID"

# 3) Get lead and active stage - create via import (API-only) or use existing
yellow "--- 3) Get lead + active stage ---"
LEAD_ID=""
LEAD_PHONE=""
WA_E2E_CSV=$(mktemp)
WA_PHONE="98$(printf '%08d' $((RANDOM * 43 + 1)))"
echo "name,phone" > "$WA_E2E_CSV"
echo "WA Webhook E2E,$WA_PHONE" >> "$WA_E2E_CSV"
IMPORT_TOKEN="$MANAGER_TOKEN"
STATUS=$(do_curl POST "$BASE_URL/api/v1/imported-data/import" -H "Authorization: Bearer $MANAGER_TOKEN" -F "file=@$WA_E2E_CSV" -F "title=WA Webhook E2E")
if [ "$STATUS" != "201" ] && [ -n "$GM_TOKEN" ]; then
  echo "name,phone" > "$WA_E2E_CSV"
  echo "WA Webhook E2E,$WA_PHONE" >> "$WA_E2E_CSV"
  IMPORT_TOKEN="$GM_TOKEN"
  STATUS=$(do_curl POST "$BASE_URL/api/v1/imported-data/import" -H "Authorization: Bearer $GM_TOKEN" -F "file=@$WA_E2E_CSV" -F "title=WA Webhook E2E")
fi
rm -f "$WA_E2E_CSV"
if [ "$STATUS" = "201" ]; then
  LEAD_ID=$(body | jq -r '.data.leads_created[0].lead_id // empty')
  LEAD_PHONE=$(body | jq -r '.data.leads_created[0].phone // empty')
  IMPORTED_DATA_ID=$(body | jq -r '.data.imported_data_id // empty')
  if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
    if [ "$IMPORT_TOKEN" = "$GM_TOKEN" ]; then
      do_curl POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"madhu@bhoomiplots.com","password":"Test@123456"}' >/dev/null
      PRESALES_TOKEN=$(body | jq -r '.data.token // empty')
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
  LEAD_ID=$(body | jq -r '.data.leads[0].id // empty')
  LEAD_PHONE=$(body | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=20&stage=communication" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(body | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(body | jq -r '.data.leads[0].phone // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && do_curl GET "$BASE_URL/api/v1/leads?page=1&limit=5" -H "Authorization: Bearer $PRESALES_TOKEN" && LEAD_ID=$(body | jq -r '.data.leads[0].id // empty') && LEAD_PHONE=$(body | jq -r '.data.leads[0].phone // empty')
fi
if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ]; then
  red "No lead found. Create a lead assigned to presales first."
  exit 1
fi
# Meta "from" is usually without +; backend matches both phone and "+"+phone
LEAD_PHONE_FROM="${LEAD_PHONE#+}"
echo "Lead ID: $LEAD_ID | Phone: $LEAD_PHONE | From: $LEAD_PHONE_FROM"

# Get active stage via API (try qualification, communication, property_visit)
STAGE_ID=""
for st in qualification communication property_visit; do
  R=$(curl -s -o /tmp/stg.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/$st" -H "Authorization: Bearer $PRESALES_TOKEN")
  [ "$R" = "200" ] && STAGE_ID=$(jq -r '.data.stage.id // empty' /tmp/stg.json) && [ -n "$STAGE_ID" ] && break
done
if [ -z "$STAGE_ID" ] || [ "$STAGE_ID" = "null" ]; then
  red "No active stage for this lead. Ensure lead has qualification/communication stage."
  exit 1
fi
echo "Stage ID: $STAGE_ID"

# 4) Webhook: simulate inbound message from lead
yellow "--- 4) Webhook: inbound message (receive + save) ---"
TS=$(date +%s)
WEBHOOK_JSON=$(cat <<EOF
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {"display_phone_number": "+919876543210", "phone_number_id": "106540352242922"},
        "contacts": [{"profile": {"name": "Test Lead"}, "wa_id": "$LEAD_PHONE_FROM"}],
        "messages": [{
          "from": "$LEAD_PHONE_FROM",
          "id": "wamid_inbound_$(date +%s)",
          "timestamp": "$TS",
          "type": "text",
          "text": {"body": "Hi I want to know more about the property"}
        }]
      },
      "field": "messages"
    }]
  }]
}
EOF
)
STATUS=$(do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$WEBHOOK_JSON")
if [ "$STATUS" = "200" ]; then
  green "PASS: Webhook POST returned 200"
  PASS=$((PASS+1))
else
  red "FAIL: Webhook POST returned $STATUS"
  FAIL=$((FAIL+1))
fi

sleep 2
# Verify inbound message saved (via API)
INBOUND_COUNT=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
if [ "${INBOUND_COUNT:-0}" -ge 1 ]; then
  green "PASS: Inbound message saved (count=$INBOUND_COUNT)"
  PASS=$((PASS+1))
else
  red "FAIL: Inbound message not found (count=${INBOUND_COUNT:-0})"
  FAIL=$((FAIL+1))
fi

# 5) Send outbound message
yellow "--- 5) Send outbound message ---"
STATUS=$(do_curl POST "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRESALES_TOKEN" \
  -d "{\"lead_stage_id\": \"$STAGE_ID\", \"message_type\": \"text\", \"message_text\": \"Sure, we will share details soon.\"}")
if [ "$STATUS" = "201" ]; then
  green "PASS: Send message returned 201"
  PASS=$((PASS+1))
  SENT_MSG_ID=$(body | jq -r '.data.message.id // empty')
  CONV_ID=$(body | jq -r '.data.message.conversation_id // empty')
  echo "  Message ID: $SENT_MSG_ID | Conversation ID: $CONV_ID"
else
  red "FAIL: Send returned $STATUS"
  body | jq .
  FAIL=$((FAIL+1))
fi

sleep 1
OUTBOUND_COUNT=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "outbound")
if [ "${OUTBOUND_COUNT:-0}" -ge 1 ]; then
  green "PASS: Outbound message saved (count=$OUTBOUND_COUNT)"
  PASS=$((PASS+1))
else
  red "FAIL: Outbound message not found (count=${OUTBOUND_COUNT:-0})"
  FAIL=$((FAIL+1))
fi

# 6) Stage-wise get: list conversations (each conv is for one stage)
yellow "--- 6) Stage-wise: GET conversations ---"
STATUS=$(do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations" -H "Authorization: Bearer $PRESALES_TOKEN")
BODY_STR=$(body)
CONV_COUNT=$(echo "$BODY_STR" | jq -r '.data.conversations | length // 0')
FIRST_CONV_STAGE=$(echo "$BODY_STR" | jq -r '.data.conversations[0].lead_stage_id // empty')
if [ "$STATUS" = "200" ] && [ "$CONV_COUNT" -ge 1 ]; then
  green "PASS: GET conversations returned 200 with $CONV_COUNT conversation(s)"
  PASS=$((PASS+1))
  if [ "$FIRST_CONV_STAGE" = "$STAGE_ID" ]; then
    green "PASS: Conversation has correct lead_stage_id (stage-wise)"
    PASS=$((PASS+1))
  else
    red "FAIL: Expected lead_stage_id $STAGE_ID, got $FIRST_CONV_STAGE"
    FAIL=$((FAIL+1))
  fi
else
  red "FAIL: GET conversations status=$STATUS or count=$CONV_COUNT"
  FAIL=$((FAIL+1))
fi

# 7) Get messages for that conversation (stage-wise messages)
CONV_ID=$(echo "$BODY_STR" | jq -r '.data.conversations[0].id // empty')
if [ -n "$CONV_ID" ] && [ "$CONV_ID" != "null" ]; then
  yellow "--- 7) Stage-wise: GET messages for conversation $CONV_ID ---"
  STATUS=$(do_curl GET "$BASE_URL/api/v1/leads/$LEAD_ID/whatsapp/conversations/$CONV_ID/messages" -H "Authorization: Bearer $PRESALES_TOKEN")
  MSG_LEN=$(body | jq -r '.data.messages | length // 0')
  INBOUND_IN_LIST=$(body | jq -r '[.data.messages[] | select(.direction=="inbound")] | length')
  OUTBOUND_IN_LIST=$(body | jq -r '[.data.messages[] | select(.direction=="outbound")] | length')
  if [ "$STATUS" = "200" ] && [ "$MSG_LEN" -ge 2 ]; then
    green "PASS: GET messages returned 200 with $MSG_LEN messages (inbound=$INBOUND_IN_LIST, outbound=$OUTBOUND_IN_LIST)"
    PASS=$((PASS+1))
  else
    red "FAIL: GET messages status=$STATUS or messages count=$MSG_LEN (expected >= 2)"
    FAIL=$((FAIL+1))
  fi
fi

# 8) Second webhook inbound (same conversation)
yellow "--- 8) Webhook: second inbound (same stage conv) ---"
TS2=$(date +%s)
WEBHOOK_JSON2=$(cat <<EOF
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {"display_phone_number": "+919876543210", "phone_number_id": "106540352242922"},
        "messages": [{
          "from": "$LEAD_PHONE_FROM",
          "id": "wamid_inbound_${TS2}_2",
          "timestamp": "$TS2",
          "type": "text",
          "text": {"body": "When can I visit?"}
        }]
      },
      "field": "messages"
    }]
  }]
}
EOF
)
STATUS=$(do_curl POST "$BASE_URL/api/v1/webhook/whatsapp" -H "Content-Type: application/json" -d "$WEBHOOK_JSON2")
sleep 2
INBOUND_TOTAL=$(api_msg_count "$LEAD_ID" "$PRESALES_TOKEN" "inbound")
if [ "$STATUS" = "200" ] && [ "${INBOUND_TOTAL:-0}" -ge 2 ]; then
  green "PASS: Second inbound received and saved (total inbound=$INBOUND_TOTAL)"
  PASS=$((PASS+1))
else
  red "FAIL: Second webhook status=$STATUS or total inbound=$INBOUND_TOTAL"
  FAIL=$((FAIL+1))
fi

echo ""
echo "============================================"
green "Passed: $PASS"
red "Failed: $FAIL"
echo "============================================"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
