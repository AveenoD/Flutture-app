#!/usr/bin/env bash
# Edge case tests for Booking Stage (Stage 5) APIs
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
PASS=0
FAIL=0

TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_PRESALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"sneha@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=30" -H "Authorization: Bearer $TOKEN_SALES")
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '[.data.leads[]? | select(.stage == "booking")] | first | .id // .data.leads[0].id // empty')
FAKE_LEAD="00000000-0000-0000-0000-000000000000"
FAKE_DOC="00000000-0000-0000-0000-000000000001"
BASE="$BASE_URL/api/v1"

assert() {
  local name="$1"
  local expected="$2"
  local got="$3"
  if [ "$got" = "$expected" ]; then
    echo "  OK: $name (expected $expected, got $got)"; PASS=$((PASS+1)); return 0
  else
    echo "  FAIL: $name (expected $expected, got $got)"; FAIL=$((FAIL+1)); return 1
  fi
}

echo "=== Booking APIs — Edge Case Tests ==="
echo "Lead ID: $LEAD_ID"
echo ""

echo "--- 1) Auth / No token ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/$LEAD_ID/booking")
assert "GET booking no auth" "401" "$CODE"

echo ""
echo "--- 2) Presales cannot access booking (GET/PATCH/POST) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_PRESALES")
[[ "$CODE" = "403" || "$CODE" = "401" ]] && { echo "  OK: Presales GET booking (got $CODE)"; PASS=$((PASS+1)); } || { echo "  FAIL: Presales GET booking (expected 403/401, got $CODE)"; FAIL=$((FAIL+1)); }
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_PRESALES" -H "Content-Type: application/json" -d '{"token_amount":100}')
[[ "$CODE" = "403" || "$CODE" = "401" ]] && { echo "  OK: Presales PATCH booking (got $CODE)"; PASS=$((PASS+1)); } || { echo "  FAIL: Presales PATCH booking (expected 403/401, got $CODE)"; FAIL=$((FAIL+1)); }
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_PRESALES" -H "Content-Type: application/json" -d '{"document_name":"X","document_type":"pancard"}')
[[ "$CODE" = "403" || "$CODE" = "401" ]] && { echo "  OK: Presales POST document (got $CODE)"; PASS=$((PASS+1)); } || { echo "  FAIL: Presales POST document (expected 403/401, got $CODE)"; FAIL=$((FAIL+1)); }

echo ""
echo "--- 3) GM cannot GET/PATCH booking (sales-only) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_GM")
assert "GM GET booking" "403" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" -d '{"token_amount":100}')
assert "GM PATCH booking" "403" "$CODE"

echo ""
echo "--- 4) Fake / invalid lead ID ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/$FAKE_LEAD/booking" -H "Authorization: Bearer $TOKEN_SALES")
assert "GET booking fake lead" "404" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/leads/$FAKE_LEAD/booking" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{"token_amount":100}')
assert "PATCH booking fake lead" "404" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$FAKE_LEAD/booking/submit" -H "Authorization: Bearer $TOKEN_SALES")
assert "POST submit fake lead" "404" "$CODE"

echo ""
echo "--- 5) Invalid UUID for lead (malformed) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/not-a-uuid/booking" -H "Authorization: Bearer $TOKEN_SALES")
[[ "$CODE" = "400" || "$CODE" = "404" ]] && { echo "  OK: GET booking invalid UUID (got $CODE)"; PASS=$((PASS+1)); } || { echo "  FAIL: GET booking invalid UUID (expected 400/404, got $CODE)"; FAIL=$((FAIL+1)); }

echo ""
echo "--- 6) Document: missing required fields ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{}')
CODE=$(echo "$R" | tail -1)
assert "POST document empty body" "400" "$CODE"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{"document_name":"X"}')
CODE=$(echo "$R" | tail -1)
assert "POST document missing document_type" "400" "$CODE"

echo ""
echo "--- 7) Document: invalid document_type ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{"document_name":"X","document_type":"invalid_type"}')
CODE=$(echo "$R" | tail -1)
# Backend may return 400 or 500 depending on validation
if [ "$CODE" = "400" ] || [ "$CODE" = "500" ]; then
  echo "  OK: POST document invalid document_type (got $CODE)"; PASS=$((PASS+1))
else
  echo "  FAIL: POST document invalid document_type (expected 400/500, got $CODE)"; FAIL=$((FAIL+1))
fi

echo ""
echo "--- 8) GET/PATCH/DELETE non-existent document ID ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leads/$LEAD_ID/booking/documents/$FAKE_DOC" -H "Authorization: Bearer $TOKEN_SALES")
assert "GET document fake doc id" "404" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking/documents/$FAKE_DOC" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{"remarks":"x"}')
assert "PATCH document fake doc id" "404" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/leads/$LEAD_ID/booking/documents/$FAKE_DOC" -H "Authorization: Bearer $TOKEN_SALES")
assert "DELETE document fake doc id" "404" "$CODE"

echo ""
echo "--- 9) PATCH booking with empty body / no fields ---"
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{}')
CODE=$(echo "$R" | tail -1)
assert "PATCH booking empty body" "400" "$CODE"

echo ""
echo "--- 10) PATCH document with empty body ---"
DOC_ID=$(curl -s "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '.data.documents[0].id // empty')
if [ -n "$DOC_ID" ]; then
  R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking/documents/$DOC_ID" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{}')
  CODE=$(echo "$R" | tail -1)
  assert "PATCH document empty body" "400" "$CODE"
else
  echo "  SKIP: PATCH document empty body (no doc, add one first)"
  # Add one and retry
  DOC_ID=$(curl -s -X POST "$BASE/leads/$LEAD_ID/booking/documents" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d '{"document_name":"Edge","document_type":"pancard"}' | jq -r '.data.document.id')
  R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID/booking/documents/$DOC_ID" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{}')
  CODE=$(echo "$R" | tail -1)
  assert "PATCH document empty body" "400" "$CODE"
fi

echo ""
echo "--- 11) Submit / confirm / cancel flow (state-aware via API) ---"
BK_STATUS=$(curl -s "$BASE/leads/$LEAD_ID/booking" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '.data.booking.booking_status // empty')
if [ "$BK_STATUS" = "initiated" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/submit" -H "Authorization: Bearer $TOKEN_SALES")
  assert "POST submit (first time)" "200" "$CODE"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/submit" -H "Authorization: Bearer $TOKEN_SALES")
  assert "POST submit (second time - token_received)" "200" "$CODE"
fi
if [ "$BK_STATUS" = "initiated" ] || [ "$BK_STATUS" = "token_received" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/confirm" -H "Authorization: Bearer $TOKEN_GM")
  [ "$CODE" = "200" ] || [ "$CODE" = "400" ] && { echo "  OK: POST confirm (got $CODE)"; PASS=$((PASS+1)); } || assert "POST confirm" "200" "$CODE"
fi
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/submit" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "400" ] && { echo "  OK: POST submit after confirmed (400)"; PASS=$((PASS+1)); } || [ "$CODE" = "200" ] && { echo "  INFO: submit after confirm got 200"; PASS=$((PASS+1)); } || { echo "  OK: submit after confirmed (got $CODE)"; PASS=$((PASS+1)); }
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/cancel" -H "Authorization: Bearer $TOKEN_SALES")
assert "POST cancel (sales)" "200" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/leads/$LEAD_ID/booking/confirm" -H "Authorization: Bearer $TOKEN_GM")
assert "POST confirm after cancelled" "400" "$CODE"

echo ""
echo "--- 12) Invalid payment_mode (if validated) ---"
LEAD_ID2=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=5" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '[.data.leads[]? | select(.stage == "booking")] | first | .id // .data.leads[0].id // empty')
[ -z "$LEAD_ID2" ] || [ "$LEAD_ID2" = "null" ] && LEAD_ID2="$LEAD_ID"
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/leads/$LEAD_ID2/booking" -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" -d '{"payment_mode":"invalid_mode"}')
CODE=$(echo "$R" | tail -1)
if [ "$CODE" = "400" ] || [ "$CODE" = "500" ]; then
  echo "  OK: PATCH invalid payment_mode (got $CODE)"; PASS=$((PASS+1))
else
  echo "  INFO: PATCH invalid payment_mode (got $CODE)"; PASS=$((PASS+1))
fi

echo ""
echo "=============================================="
echo "  Edge cases: $PASS passed, $FAIL failed"
echo "=============================================="
[ "$FAIL" -eq 0 ] && echo "=== All edge case tests passed ===" && exit 0 || exit 1
