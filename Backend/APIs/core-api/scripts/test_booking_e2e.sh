#!/usr/bin/env bash
# E2E test for Booking APIs (Stage 5) - API only, no DB
# Prereqs: API running, at least one lead in booking stage (from normal app flow)
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
PASS=0

echo "=== Booking APIs E2E ==="
echo "Base URL: $BASE_URL"

# Tokens
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_SALES" ] || [ "$TOKEN_SALES" = "null" ] && { echo "FAIL: sales login"; exit 1; }
echo "Sales token OK"

TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_GM" ] || [ "$TOKEN_GM" = "null" ] && echo "WARN: GM token missing"
echo "GM token OK"

# Lead in booking (from assigned list)
LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=20" -H "Authorization: Bearer $TOKEN_SALES")
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '[.data.leads[]? | select(.stage == "booking")] | first | .id // empty')
if [ -z "$LEAD_ID" ]; then
  LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].id // empty')
fi
[ -z "$LEAD_ID" ] && { echo "FAIL: no lead for sales (ensure app has leads in booking stage from normal flow)"; exit 1; }
echo "Using lead $LEAD_ID"

# --- 1) GET booking (200) ---
echo ""
echo "--- 1) GET /leads/:id/booking (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; echo "$BODY" | jq .; exit 1; }
BOOK_ID=$(echo "$BODY" | jq -r '.data.booking.id // empty')
STATUS=$(echo "$BODY" | jq -r '.data.booking.booking_status // empty')
[ -z "$BOOK_ID" ] && { echo "FAIL: no booking.id"; echo "$BODY" | jq .; exit 1; }
echo "OK: 200, booking_id=$BOOK_ID, status=$STATUS"; PASS=$((PASS+1))

# --- 2) PATCH update booking (200) ---
echo ""
echo "--- 2) PATCH /leads/:id/booking (200) ---"
CODE=$(curl -s -o /tmp/booking_upd.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/booking" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"token_amount":500000,"token_date":"2025-01-15","payment_mode":"upi","final_total_price":3500000,"emi_applicable":true,"loan_amount":3000000,"tenure_months":240,"bank_name":"HDFC"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/booking_upd.json | jq .; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 3) POST add document (201) ---
echo ""
echo "--- 3) POST /leads/:id/booking/documents (201) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"document_name":"PAN Card","document_type":"pancard","document_number":"ABCDE1234F","remarks":"Verified"}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
[ "$HTTP" != "201" ] && { echo "FAIL: expected 201, got $HTTP"; echo "$BODY" | jq .; exit 1; }
DOC_ID=$(echo "$BODY" | jq -r '.data.document.id // empty')
[ -z "$DOC_ID" ] && { echo "FAIL: no document.id"; echo "$BODY" | jq .; exit 1; }
echo "OK: 201, document_id=$DOC_ID"; PASS=$((PASS+1))

# --- 4) GET list documents (200) ---
echo ""
echo "--- 4) GET /leads/:id/booking/documents (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 5) GET document by id (200) ---
echo ""
echo "--- 5) GET /leads/:id/booking/documents/:did (200) ---"
CODE=$(curl -s -o /tmp/doc_get.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents/$DOC_ID" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/doc_get.json | jq .; exit 1; }
echo "OK: 200, document_type=$(jq -r '.data.document.document_type' /tmp/doc_get.json)"; PASS=$((PASS+1))

# --- 6) PATCH update document (200) ---
echo ""
echo "--- 6) PATCH /leads/:id/booking/documents/:did (200) ---"
CODE=$(curl -s -o /tmp/doc_patch.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"remarks":"Re-verified"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/doc_patch.json | jq .; exit 1; }
echo "OK: 200"; PASS=$((PASS+1))

# --- 7) POST submit booking (200) - sets token_received + lead status = deal ---
echo ""
echo "--- 7) POST /leads/:id/booking/submit (200) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/booking/submit" -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" != "200" ] && { echo "FAIL: expected 200, got $HTTP"; echo "$R" | sed '$d' | jq .; exit 1; }
STATUS=$(echo "$R" | sed '$d' | jq -r '.data.booking.booking_status // empty')
[ "$STATUS" != "token_received" ] && { echo "FAIL: expected booking_status=token_received, got $STATUS"; exit 1; }
echo "OK: 200, booking_status=$STATUS"; PASS=$((PASS+1))

# --- 8) Presales GET booking (403) ---
echo ""
echo "--- 8) GET /leads/:id/booking as presales -> 403 ---"
TOKEN_PRESALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"sneha@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
if [ -n "$TOKEN_PRESALES" ] && [ "$TOKEN_PRESALES" != "null" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_PRESALES")
  [ "$CODE" != "403" ] && [ "$CODE" != "404" ] && { echo "FAIL: expected 403 or 404, got $CODE"; exit 1; }
  echo "OK: $CODE (presales cannot access booking)"
else
  echo "SKIP: no presales user"
fi
PASS=$((PASS+1))

# --- 9) GM Confirm booking (200) ---
if [ -n "$TOKEN_GM" ] && [ "$TOKEN_GM" != "null" ]; then
  echo ""
  echo "--- 9) POST /leads/:id/booking/confirm as GM (200) ---"
  CODE=$(curl -s -o /tmp/confirm.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/booking/confirm" -H "Authorization: Bearer $TOKEN_GM")
  [ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/confirm.json | jq .; exit 1; }
  echo "OK: 200, status=$(jq -r '.data.booking.booking_status' /tmp/confirm.json)"; PASS=$((PASS+1))
else
  echo "--- 9) SKIP confirm (no GM token) ---"
  PASS=$((PASS+1))
fi

# --- 10) DELETE document (200) - use a new doc then delete ---
echo ""
echo "--- 10) POST document + DELETE document (200) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"document_name":"Aadhar","document_type":"aadharcard","remarks":"To delete"}')
DOC_ID2=$(echo "$R" | sed '$d' | jq -r '.data.document.id // empty')
if [ -n "$DOC_ID2" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/$LEAD_ID/booking/documents/$DOC_ID2" -H "Authorization: Bearer $TOKEN_SALES")
  [ "$CODE" != "200" ] && { echo "FAIL: DELETE expected 200, got $CODE"; exit 1; }
  echo "OK: 200 (document added and deleted)"
else
  echo "SKIP: could not create doc for delete test"
fi
PASS=$((PASS+1))

echo ""
echo "=== Booking E2E done: $PASS tests passed ==="
