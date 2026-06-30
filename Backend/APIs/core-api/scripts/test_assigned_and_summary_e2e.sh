#!/usr/bin/env bash
# E2E test for GET /api/v1/leads/assigned and GET /api/v1/leads/:id/summary (sales only)
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
FAKE_UUID="00000000-0000-0000-0000-000000000001"
PASS=0

echo "=== Assigned leads & Lead summary E2E ==="
echo "Base URL: $BASE_URL"

# Tokens
LOGIN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}")
TOKEN_SALES=$(echo "$LOGIN_SALES" | jq -r '.data.token // empty' 2>/dev/null)
if [ -z "$TOKEN_SALES" ] || [ "$TOKEN_SALES" = "null" ]; then
  echo "FAIL: sales login (is API running at $BASE_URL?)"; echo "$LOGIN_SALES" | head -c 300; echo ""; exit 1
fi
echo "Sales token OK"

LOGIN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}")
TOKEN_PS=$(echo "$LOGIN_PS" | jq -r '.data.token // empty' 2>/dev/null)
if [ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ]; then
  echo "FAIL: presales login"; echo "$LOGIN_PS" | head -c 300; echo ""; exit 1
fi
echo "Presales token OK"

TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty' 2>/dev/null)

# Get a lead that sales can see: first try GET /leads/assigned; if empty, do handoff (presales create visit -> sales accept)
LEAD_ID_FOR_SALES=""
ASSIGNED_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=5" -H "Authorization: Bearer $TOKEN_SALES")
if [ "$(echo "$ASSIGNED_RESP" | jq -r '.data.leads | length')" -ge 1 ]; then
  LEAD_ID_FOR_SALES=$(echo "$ASSIGNED_RESP" | jq -r '.data.leads[0].id')
  echo "Using existing assigned lead: $LEAD_ID_FOR_SALES"
fi

if [ -z "$LEAD_ID_FOR_SALES" ] || [ "$LEAD_ID_FOR_SALES" = "null" ]; then
  echo "No assigned lead yet; running handoff flow..."
  LEAD_ID_PS=$(curl -s "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
  [ -z "$LEAD_ID_PS" ] && { echo "FAIL: no lead for presales"; exit 1; }
  curl -s -o /dev/null -X POST "$BASE_URL/api/v1/leads/$LEAD_ID_PS/visits" \
    -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
    -d '{"visit_date":"2026-01-20","visit_time":"10:00","visit_type":"first_visit","location_city":"Mumbai"}'
  ACCEPT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID_PS/accept" -H "Authorization: Bearer $TOKEN_SALES")
  if [ "$(echo "$ACCEPT_RESP" | tail -n1)" = "200" ]; then
    LEAD_ID_FOR_SALES="$LEAD_ID_PS"
    echo "Handoff + accept OK; lead $LEAD_ID_FOR_SALES"
  else
    ASSIGNED_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=5" -H "Authorization: Bearer $TOKEN_SALES")
    LEAD_ID_FOR_SALES=$(echo "$ASSIGNED_RESP" | jq -r '.data.leads[0].id // empty')
  fi
fi

[ -z "$LEAD_ID_FOR_SALES" ] || [ "$LEAD_ID_FOR_SALES" = "null" ] && { echo "WARN: no lead visible to sales; summary tests may 404"; }

# --- GET /api/v1/leads/assigned (sales) → 200 ---
echo ""
echo "--- GET /api/v1/leads/assigned (sales) → 200 ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/assigned?limit=5" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "404" ] && echo "$BODY" | jq -e '.message | test("Lead not found")' >/dev/null 2>&1; then
  echo "FAIL: Server returned 404 'Lead not found' - /assigned may be matched as lead :id. Restart the API with the latest build (go build && ./core-api)."
  exit 1
fi
[ "$HTTP" = "200" ] && [ "$(echo "$BODY" | jq -r '.success')" = "true" ] && [ -n "$(echo "$BODY" | jq -r '.data.leads')" ] && [ -n "$(echo "$BODY" | jq -r '.data.pagination')" ] && { echo "OK: 200, leads + pagination"; PASS=$((PASS+1)); } || { echo "FAIL: $HTTP or invalid body"; echo "$BODY" | jq . 2>/dev/null; exit 1; }

# --- GET /api/v1/leads/assigned?filter=assigned (sales) → 200 ---
echo ""
echo "--- GET /api/v1/leads/assigned?filter=assigned (sales) → 200 ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/assigned?filter=assigned&limit=5" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" = "200" ] && [ "$(echo "$R" | sed '$d' | jq -r '.success')" = "true" ] && { echo "OK: 200"; PASS=$((PASS+1)); } || { echo "FAIL: $HTTP"; exit 1; }

# --- GET /api/v1/leads/assigned?filter=pending (sales) → 200 ---
echo ""
echo "--- GET /api/v1/leads/assigned?filter=pending (sales) → 200 ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/assigned?filter=pending&limit=5" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" = "200" ] && [ "$(echo "$R" | sed '$d' | jq -r '.success')" = "true" ] && { echo "OK: 200"; PASS=$((PASS+1)); } || { echo "FAIL: $HTTP"; exit 1; }

# --- GET /api/v1/leads/assigned as presales → 403 ---
echo ""
echo "--- GET /api/v1/leads/assigned (presales) → 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/assigned" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "403" ] && { echo "OK: 403"; PASS=$((PASS+1)); } || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- GET /api/v1/leads/assigned as GM → 403 ---
if [ -n "$TOKEN_GM" ] && [ "$TOKEN_GM" != "null" ]; then
  echo ""
  echo "--- GET /api/v1/leads/assigned (GM) → 403 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/assigned" -H "Authorization: Bearer $TOKEN_GM")
  [ "$CODE" = "403" ] && { echo "OK: 403"; PASS=$((PASS+1)); } || { echo "FAIL: expected 403, got $CODE"; exit 1; }
fi

# --- GET /api/v1/leads/:id/summary (sales, valid lead) → 200, shape ---
if [ -n "$LEAD_ID_FOR_SALES" ] && [ "$LEAD_ID_FOR_SALES" != "null" ]; then
  echo ""
  echo "--- GET /api/v1/leads/$LEAD_ID_FOR_SALES/summary (sales) → 200, shape ---"
  R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID_FOR_SALES/summary" -H "Authorization: Bearer $TOKEN_SALES")
  HTTP=$(echo "$R" | tail -n1)
  BODY=$(echo "$R" | sed '$d')
  if [ "$HTTP" = "200" ]; then
    for key in lead recent_calls whatsapp_conversations stage_remarks; do
      has=$(echo "$BODY" | jq -r ".data | has(\"$key\")")
      [ "$has" = "true" ] || { echo "FAIL: summary missing key $key"; echo "$BODY" | jq .data 2>/dev/null; exit 1; }
    done
    [ "$(echo "$BODY" | jq -r '.data.lead.id')" = "$LEAD_ID_FOR_SALES" ] || { echo "FAIL: summary.lead.id mismatch"; exit 1; }
    echo "OK: 200, lead, recent_calls, whatsapp_conversations, stage_remarks present"; PASS=$((PASS+1))
  else
    echo "FAIL: expected 200, got $HTTP"; echo "$BODY" | jq . 2>/dev/null; exit 1
  fi
else
  echo ""
  echo "--- Skip GET /leads/:id/summary (no lead for sales) ---"
fi

# --- GET /api/v1/leads/:id/summary as presales → 403 ---
if [ -n "$LEAD_ID_FOR_SALES" ] && [ "$LEAD_ID_FOR_SALES" != "null" ]; then
  echo ""
  echo "--- GET /api/v1/leads/:id/summary (presales) → 403 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID_FOR_SALES/summary" -H "Authorization: Bearer $TOKEN_PS")
  [ "$CODE" = "403" ] && { echo "OK: 403"; PASS=$((PASS+1)); } || { echo "FAIL: expected 403, got $CODE"; exit 1; }
fi

# --- GET /api/v1/leads/:id/summary (sales, fake UUID) → 404 ---
echo ""
echo "--- GET /api/v1/leads/:id/summary (sales, fake UUID) → 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$FAKE_UUID/summary" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "404" ] && { echo "OK: 404"; PASS=$((PASS+1)); } || { echo "FAIL: expected 404, got $CODE"; exit 1; }

echo ""
echo "=============================================="
echo "  Assigned & Summary E2E: $PASS assertions passed"
echo "=============================================="
echo ""
echo "=== Assigned leads & Lead summary E2E passed ==="
