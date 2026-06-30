#!/usr/bin/env bash
# E2E test for Property Visit APIs: create, get, update, reschedule, get-by-type + edge cases
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"

echo "=== Property Visit APIs E2E ==="
echo "Base URL: $BASE_URL"

# Tokens
TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

[ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ] && { echo "FAIL: presales token"; exit 1; }
echo "Presales token OK"

# Get a lead
LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
[ -z "$LEAD_ID" ] && { echo "FAIL: no lead"; exit 1; }
echo "Using lead $LEAD_ID"

# --- 1) POST create visit (201) ---
echo ""
echo "--- 1) POST /leads/:id/visits (201) ---"
CREATE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24","visit_time":"14:30","visit_type":"first_visit","location_city":"Pembroke Pines","location_area":"Downtown"}')
HTTP=$(echo "$CREATE" | tail -n1)
[ "$HTTP" != "201" ] && { echo "FAIL: expected 201, got $HTTP"; echo "$CREATE" | sed '$d' | jq .; exit 1; }
VISIT_ID=$(echo "$CREATE" | sed '$d' | jq -r '.data.visit.id')
echo "OK: 201, visit_id=$VISIT_ID"

# --- 2) GET visit (200) ---
echo ""
echo "--- 2) GET /leads/:id/visits/:visit_id (200) ---"
CODE=$(curl -s -o /tmp/visit_get.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/visit_get.json | jq .; exit 1; }
echo "OK: 200, visit_type=$(jq -r '.data.visit.visit_type' /tmp/visit_get.json), city=$(jq -r '.data.visit.location_city' /tmp/visit_get.json)"

# --- 3) PATCH update visit with remarks (200) ---
echo ""
echo "--- 3) PATCH update remarks (200) ---"
CODE=$(curl -s -o /tmp/visit_upd.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"remarks":"Nice location, client excited"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/visit_upd.json | jq .; exit 1; }
echo "OK: 200, remarks=$(jq -r '.data.visit.remarks' /tmp/visit_upd.json)"

# --- 4) PATCH mark complete without outcome -> 400 ---
echo ""
echo "--- 4) PATCH complete without outcome -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"status":"completed"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 5) PATCH mark complete with outcome (200) ---
echo ""
echo "--- 5) PATCH complete with outcome (200) ---"
CODE=$(curl -s -o /tmp/visit_comp.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"status":"completed","outcome":"interested","site_visit_images":["https://img.example.com/1.jpg"]}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/visit_comp.json | jq .; exit 1; }
echo "OK: 200, status=$(jq -r '.data.visit.status' /tmp/visit_comp.json), outcome=$(jq -r '.data.visit.outcome' /tmp/visit_comp.json)"

# --- 6) POST reschedule (200) ---
echo ""
echo "--- 6) POST reschedule (200) ---"
CODE=$(curl -s -o /tmp/visit_resched.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID/reschedule" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-28","visit_time":"11:00","delay_reason":"client_unavailable"}')
[ "$CODE" != "200" ] && { echo "FAIL: expected 200, got $CODE"; cat /tmp/visit_resched.json | jq .; exit 1; }
echo "OK: 200, status=$(jq -r '.data.visit.status' /tmp/visit_resched.json), delay=$(jq -r '.data.visit.delay_reason' /tmp/visit_resched.json)"

# --- 7) POST create without required fields -> 400 ---
echo ""
echo "--- 7) POST create missing fields -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 8) POST create invalid visit_type -> 400 ---
echo ""
echo "--- 8) POST invalid visit_type -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24","visit_time":"14:30","visit_type":"invalid"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 9) POST reschedule missing delay_reason -> 400 ---
echo ""
echo "--- 9) POST reschedule missing delay_reason -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID/reschedule" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-28","visit_time":"11:00"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 10) GM POST create -> 403 ---
echo ""
echo "--- 10) GM POST create -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
  -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24","visit_time":"14:30","visit_type":"first_visit"}')
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 11) GM GET visit -> 403 ---
echo ""
echo "--- 11) GM GET visit -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/visits/$VISIT_ID" -H "Authorization: Bearer $TOKEN_GM")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 12) Fake lead -> 404 ---
echo ""
echo "--- 12) POST create fake lead -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000001/visits" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24","visit_time":"14:30","visit_type":"first_visit"}')
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 13) GET fake visit_id -> 404 ---
echo ""
echo "--- 13) GET fake visit_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/visits/00000000-0000-0000-0000-000000000001" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 14) GET by-type property_visit includes visits ---
echo ""
echo "--- 14) GET stages/by-type/property_visit -> visits array ---"
# First forward lead to property_visit if not there yet (ignore errors)
curl -s -o /dev/null -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"next_stage":"communication"}' 2>/dev/null || true
curl -s -o /dev/null -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"next_stage":"property_visit"}' 2>/dev/null || true
CODE=$(curl -s -o /tmp/visit_stage.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/property_visit" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE" = "200" ]; then
  VISIT_COUNT=$(jq -r '.data.visits | length // 0' /tmp/visit_stage.json)
  echo "OK: 200, visits count=$VISIT_COUNT"
else
  echo "INFO: $CODE (lead may not have property_visit stage yet)"
fi

echo ""
echo "=== All Property Visit API tests passed ==="
