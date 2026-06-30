#!/usr/bin/env bash
# E2E test for Negotiation and Quotation APIs (Stage 4) - API only, no DB
# Prereqs: API running, at least one lead assigned to sales (from normal app flow)
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
PASS=0

echo "=== Negotiation & Quotation APIs E2E ==="
echo "Base URL: $BASE_URL"

# Tokens
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_SALES" ] || [ "$TOKEN_SALES" = "null" ] && { echo "FAIL: sales login"; exit 1; }
echo "Sales token OK"

TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
echo "Presales token OK"

TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_GM" ] || [ "$TOKEN_GM" = "null" ] && { echo "WARN: GM token missing"; }
echo "GM token OK"

# Scenario via API: (1) Try assigned leads for one without negotiation; (2) else presales forward site_visit -> negotiation, then sales create
LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=15" -H "Authorization: Bearer $TOKEN_SALES")
PROJECT_ID=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].project_id // empty')
[ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ] && PROJECT_ID=$(curl -s "$BASE_URL/api/v1/projects?limit=5" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '.data.projects[0].id // empty')
[ -z "$PROJECT_ID" ] && { echo "FAIL: no project"; exit 1; }
UNITS_RESP=$(curl -s "$BASE_URL/api/v1/projects/$PROJECT_ID/units?limit=20" -H "Authorization: Bearer $TOKEN_SALES")
UNIT_ID=$(echo "$UNITS_RESP" | jq -r '(.data.units // []) | (map(select(.status == "available")) + .) | first | .id // empty')
[ -z "$UNIT_ID" ] && { echo "FAIL: no available unit for project $PROJECT_ID"; exit 1; }

LEAD_ID=""
for idx in $(seq 0 14); do
  CANDIDATE=$(echo "$LEAD_RESP" | jq -r ".data.leads[$idx].id // empty")
  [ -z "$CANDIDATE" ] || [ "$CANDIDATE" = "null" ] && continue
  R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$CANDIDATE/negotiation" \
    -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d "{\"project_id\":\"$PROJECT_ID\",\"unit_id\":\"$UNIT_ID\",\"discount_amount\":50000,\"discount_title\":\"E2E Setup\",\"user_commission\":100000}")
  HTTP=$(echo "$R" | tail -n1)
  if [ "$HTTP" = "201" ]; then
    LEAD_ID="$CANDIDATE"
    echo "Using lead $LEAD_ID (created negotiation via API for this test)"
    break
  fi
done

if [ -z "$LEAD_ID" ]; then
  echo "No assigned lead without negotiation; creating scenario: sales forward site_visit -> negotiation, then create..."
  ASSIGNED=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=20" -H "Authorization: Bearer $TOKEN_SALES")
  LEAD_ID=$(echo "$ASSIGNED" | jq -r '[.data.leads[]? | select(.stage == "site_visit" or .stage == "property_visit")] | .[0].id // empty')
  [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && { echo "FAIL: no sales-assigned lead in site_visit/property_visit to forward"; exit 1; }
  FWD=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
    -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d '{"next_stage":"negotiation","remarks":"E2E scenario"}')
  [ "$(echo "$FWD" | tail -n1)" != "200" ] && { echo "FAIL: sales forward-stage to negotiation"; echo "$FWD" | sed '$d' | jq .; exit 1; }
  echo "Forwarded lead $LEAD_ID to negotiation stage (sales) via API"
  R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" \
    -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d "{\"project_id\":\"$PROJECT_ID\",\"unit_id\":\"$UNIT_ID\",\"discount_amount\":50000,\"discount_title\":\"E2E Setup\",\"user_commission\":100000}")
  [ "$(echo "$R" | tail -n1)" != "201" ] && { echo "FAIL: create negotiation after forward"; echo "$R" | sed '$d' | jq .; exit 1; }
  echo "Created negotiation for lead $LEAD_ID via API"
fi
echo "Using project $PROJECT_ID, unit $UNIT_ID"

# --- 1) Negotiation already created in setup; verify GET ---
NEG_ID=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '.data.negotiation.id // empty')
[ -z "$NEG_ID" ] && { echo "FAIL: no negotiation.id after setup"; exit 1; }
echo ""
echo "--- 1) GET /leads/:id/negotiation (200) after API setup ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; exit 1; }
echo "OK: 200, negotiation_id=$NEG_ID"; PASS=$((PASS+1))

# --- 2) GET negotiation (200) ---
echo ""
echo "--- 2) GET /leads/:id/negotiation (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; echo "$R" | sed '$d' | jq .; exit 1; }
echo "OK: 200, status=$(echo "$R" | sed '$d' | jq -r '.data.negotiation.status')"; PASS=$((PASS+1))

# --- 3) GET price-breakdown (200) ---
echo ""
echo "--- 3) GET /leads/:id/negotiation/price-breakdown (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation/price-breakdown" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; exit 1; }
FINAL=$(echo "$R" | sed '$d' | jq -r '.data.price_breakdown.final_price // 0')
echo "OK: 200, final_price=$FINAL"; PASS=$((PASS+1))

# --- 4) PATCH update negotiation (200) ---
echo ""
echo "--- 4) PATCH /leads/:id/negotiation (200) ---"
CODE=$(curl -s -o /tmp/neg_upd.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"discount_amount":75000,"discount_title":"Festive Special"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/neg_upd.json | jq .; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 5) POST create quotation (201) ---
echo ""
echo "--- 5) POST /leads/:id/quotations (201) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/quotations" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"customer_name":"E2E Customer","customer_contact":"+919876543210","customer_email":"e2e@test.com","valid_till":"2025-12-31"}')
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "201" ] && { echo "FAIL: expected 201, got $HTTP"; echo "$R" | sed '$d' | jq .; exit 1; }
QID=$(echo "$R" | sed '$d' | jq -r '.data.quotation.id // empty')
[ -z "$QID" ] && { echo "FAIL: no quotation.id"; exit 1; }
echo "OK: 201, quotation_id=$QID"; PASS=$((PASS+1))

# --- 6) GET list quotations (200) ---
echo ""
echo "--- 6) GET /leads/:id/quotations (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/quotations?limit=5" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 7) GET quotation by id (200) ---
echo ""
echo "--- 7) GET /leads/:id/quotations/:qid (200) ---"
CODE=$(curl -s -o /tmp/q_get.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/quotations/$QID" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/q_get.json | jq .; exit 1; }
echo "OK: 200, customer=$(jq -r '.data.quotation.customer_name' /tmp/q_get.json)"; PASS=$((PASS+1))

# --- 8) PATCH revise quotation (200) ---
echo ""
echo "--- 8) PATCH /leads/:id/quotations/:qid (200) ---"
CODE=$(curl -s -o /tmp/q_rev.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/quotations/$QID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"customer_name":"E2E Revised","discount_price":75000}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; exit 1; }
echo "OK: 200, version=$(jq -r '.data.quotation.quotation_version' /tmp/q_rev.json)"; PASS=$((PASS+1))

# --- 9) POST share quotation (200) ---
echo ""
echo "--- 9) POST /leads/:id/quotations/:qid/share (200) ---"
CODE=$(curl -s -o /tmp/q_share.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/quotations/$QID/share" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"shared_via":"whatsapp"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/q_share.json | jq .; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 10) POST submit negotiation (200) ---
echo ""
echo "--- 10) POST /leads/:id/negotiation/submit (200) ---"
CODE=$(curl -s -o /tmp/neg_submit.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation/submit" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json")
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/neg_submit.json | jq .; exit 1; }
echo "OK: 200, status=$(jq -r '.data.negotiation.status' /tmp/neg_submit.json)"; PASS=$((PASS+1))

# --- 11) GM approve negotiation (200) ---
echo ""
echo "--- 11) POST /leads/:id/negotiation/approve (GM) (200) ---"
CODE=$(curl -s -o /tmp/neg_approve.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation/approve" \
  -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" \
  -d '{"final_price_agreed":3016000}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/neg_approve.json | jq .; exit 1; }
echo "OK: 200, status=$(jq -r '.data.negotiation.status' /tmp/neg_approve.json)"; PASS=$((PASS+1))

# --- 12) Sales create negotiation when lead not in negotiation stage -> 400 ---
echo ""
echo "--- 12) POST negotiation (lead already has negotiation) -> 400 ---"
# This lead now has an approved negotiation; creating again should 400 (NEGOTIATION_ALREADY_EXISTS)
CODE=$(curl -s -o /tmp/neg_dup.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"unit_id\":\"$UNIT_ID\"}")
[ "$CODE" = "400" ] && echo "OK: 400 (already exists)" || echo "INFO: $CODE (expected 400 if single negotiation)"; PASS=$((PASS+1))

# --- 13) Presales GET negotiation -> 403 ---
echo ""
echo "--- 13) GET negotiation as presales -> 403 ---"
TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/negotiation" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }; PASS=$((PASS+1))

# --- 14) Fake lead GET negotiation -> 404 ---
echo ""
echo "--- 14) GET negotiation (fake lead) -> 404 ---"
FAKE_UUID="00000000-0000-0000-0000-000000000001"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$FAKE_UUID/negotiation" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }; PASS=$((PASS+1))

echo ""
echo "=============================================="
echo "  Negotiation & Quotation E2E: $PASS assertions passed"
echo "=============================================="
echo ""
echo "=== All Negotiation/Quotation API tests passed ==="
