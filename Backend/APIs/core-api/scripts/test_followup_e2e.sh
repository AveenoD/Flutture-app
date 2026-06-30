#!/usr/bin/env bash
# E2E test for follow-up APIs: create, get details, mark complete + edge cases
# Presales and Sales can use; GM/Manager get 403. Requires: API running, DB with users and leads.
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"

echo "=== Follow-up APIs E2E (create, get, complete + edge cases) ==="
echo "Base URL: $BASE_URL"

# Tokens
TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

if [ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ]; then
  echo "FAIL: Could not get presales token"
  exit 1
fi
echo "Presales token obtained"

# Lead and stage (presales-assigned)
LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_PS")
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].id // empty')
if [ -z "$LEAD_ID" ]; then
  echo "FAIL: No lead for presales"
  exit 1
fi
# Stage from by-stage (communication or property_visit that has stage_remarks)
STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/by-stage/communication?limit=5" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].stage_remarks[0].stage_id // empty')
if [ -z "$STAGE_ID" ]; then
  STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/by-stage/property_visit?limit=5" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].stage_remarks[0].stage_id // empty')
fi
if [ -z "$STAGE_ID" ]; then
  # Get any lead_stage for this lead from by-stage response (first lead's first stage_remark)
  for st in qualification communication property_visit; do
    STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/by-stage/$st?limit=20" -H "Authorization: Bearer $TOKEN_PS" | jq -r --arg lid "$LEAD_ID" '.data.leads[] | select(.lead.id == $lid) | .stage_remarks[0].stage_id // empty')
    [ -n "$STAGE_ID" ] && break
  done
fi
if [ -z "$STAGE_ID" ]; then
  STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/communication" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.stage.id // empty')
fi
if [ -z "$STAGE_ID" ]; then
  STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/qualification" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.stage.id // empty')
fi
if [ -z "$STAGE_ID" ]; then
  STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/property_visit" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.stage.id // empty')
fi
if [ -z "$STAGE_ID" ]; then
  echo "FAIL: No stage_id found for lead (lead has no communication/qualification/property_visit stage)"
  exit 1
fi
echo "Using lead $LEAD_ID, stage $STAGE_ID"

# --- 1) POST create follow-up (success) ---
echo ""
echo "--- 1) POST /leads/:id/follow-ups (201) ---"
CREATE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\",\"remark\":\"E2E test follow-up remark\"}")
HTTP=$(echo "$CREATE" | tail -n1)
if [ "$HTTP" != "201" ]; then
  echo "FAIL: expected 201, got $HTTP"; echo "$CREATE" | sed '$d' | jq .; exit 1
fi
FOLLOWUP_ID=$(echo "$CREATE" | sed '$d' | jq -r '.data.follow_up.id')
echo "OK: 201, follow_up id: $FOLLOWUP_ID"

# --- 2) GET follow-up details (200) ---
echo ""
echo "--- 2) GET /leads/:id/follow-ups/:followup_id (200) ---"
CODE=$(curl -s -o /tmp/fu_get.json -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE" != "200" ]; then
  echo "FAIL: expected 200, got $CODE"; cat /tmp/fu_get.json | jq .; exit 1
fi
echo "OK: 200, remark=$(jq -r '.data.follow_up.remark' /tmp/fu_get.json)"

# --- 3) PATCH complete (200) ---
echo ""
echo "--- 3) PATCH .../complete (200) ---"
CODE=$(curl -s -o /tmp/fu_complete.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID/complete" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"outcome":"follow_up"}')
if [ "$CODE" != "200" ]; then
  echo "FAIL: expected 200, got $CODE"; cat /tmp/fu_complete.json | jq .; exit 1
fi
echo "OK: 200, status=$(jq -r '.data.follow_up.status' /tmp/fu_complete.json), outcome=$(jq -r '.data.follow_up.outcome' /tmp/fu_complete.json)"

# --- 4) Create again for Sales test (new follow-up) ---
FOLLOWUP_ID2=$(curl -s -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"whatsapp\",\"followup_date\":\"2025-03-26T12:00:00Z\",\"remark\":\"Second follow-up for edge case tests\"}" | jq -r '.data.follow_up.id')

# --- 5) Create: missing remark -> 400 ---
echo ""
echo "--- 5) POST create without remark -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\"}")
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 6) Create: empty remark -> 400 ---
echo ""
echo "--- 6) POST create with empty remark -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\",\"remark\":\"\"}")
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 7) Complete: missing outcome -> 400 ---
echo ""
echo "--- 7) PATCH complete without outcome -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID2/complete" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 8) Complete: invalid outcome -> 400 ---
echo ""
echo "--- 8) PATCH complete invalid outcome -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID2/complete" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"outcome":"invalid_value"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

# --- 9) GM create follow-up -> 403 ---
echo ""
echo "--- 9) GM POST create follow-up -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\",\"remark\":\"GM cannot create\"}")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 10) GM GET follow-up -> 403 ---
echo ""
echo "--- 10) GM GET follow-up details -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_GM")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 11) GM PATCH complete -> 403 ---
echo ""
echo "--- 11) GM PATCH complete -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID2/complete" \
  -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" \
  -d '{"outcome":"interested"}')
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 12) Fake lead ID -> 404 (create) ---
echo ""
echo "--- 12) POST create with fake lead_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000001/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\",\"remark\":\"x\"}")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 13) GET with fake followup_id -> 404 ---
echo ""
echo "--- 13) GET with fake followup_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/00000000-0000-0000-0000-000000000001" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 14) PATCH complete with fake followup_id -> 404 ---
echo ""
echo "--- 14) PATCH complete with fake followup_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/00000000-0000-0000-0000-000000000001/complete" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"outcome":"interested"}')
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 15) Sales: create/get/complete for lead assigned to Presales (404 if sales has no access to that lead) ---
# If sales has a different lead, they can create for their lead. So test: sales trying to get presales's follow-up (same lead but lead is assigned to presales) -> 404
echo ""
echo "--- 15) Sales GET follow-up for presales-assigned lead -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "404" ] && echo "OK: 404 (lead not assigned to sales)" || [ "$CODE" = "200" ] && echo "OK: 200 (lead shared with sales)" || { echo "FAIL: got $CODE"; exit 1; }

# --- 16) Sales POST create for presales lead -> 404 ---
echo ""
echo "--- 16) Sales POST create for presales-assigned lead -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"call\",\"followup_date\":\"2025-03-25T10:00:00Z\",\"remark\":\"Sales\"}")
[ "$CODE" = "404" ] && echo "OK: 404" || [ "$CODE" = "201" ] && echo "OK: 201 (lead shared)" || { echo "FAIL: got $CODE"; exit 1; }

# --- 17) Create follow-up for delete test ---
FOLLOWUP_TO_DELETE=$(curl -s -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d "{\"lead_stage_id\":\"$STAGE_ID\",\"followup_type\":\"visit\",\"followup_date\":\"2025-03-27T09:00:00Z\",\"remark\":\"To be deleted\"}" | jq -r '.data.follow_up.id')
[ -z "$FOLLOWUP_TO_DELETE" ] || [ "$FOLLOWUP_TO_DELETE" = "null" ] && { echo "FAIL: Could not create follow-up for delete test"; exit 1; }

# --- 18) DELETE follow-up (200) ---
echo ""
echo "--- 18) DELETE /leads/:id/follow-ups/:followup_id (200) ---"
CODE=$(curl -s -o /tmp/fu_del.json -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_TO_DELETE" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE" != "200" ]; then
  echo "FAIL: expected 200, got $CODE"; cat /tmp/fu_del.json | jq .; exit 1
fi
echo "OK: 200, $(jq -r '.message' /tmp/fu_del.json)"

# --- 19) GET deleted follow-up -> 404 ---
echo ""
echo "--- 19) GET deleted follow-up -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_TO_DELETE" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 20) DELETE with fake lead_id -> 404 ---
echo ""
echo "--- 20) DELETE with fake lead_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000001/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 21) DELETE with fake followup_id -> 404 ---
echo ""
echo "--- 21) DELETE with fake followup_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/00000000-0000-0000-0000-000000000001" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- 22) GM DELETE follow-up -> 403 ---
echo ""
echo "--- 22) GM DELETE follow-up -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_GM")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 23) Sales DELETE for presales-assigned lead -> 404 ---
echo ""
echo "--- 23) Sales DELETE for presales-assigned lead -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/leads/$LEAD_ID/follow-ups/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "404" ] && echo "OK: 404" || [ "$CODE" = "200" ] && echo "OK: 200 (lead shared)" || { echo "FAIL: got $CODE"; exit 1; }

echo ""
echo "=== All follow-up API tests passed (create, get, complete, delete + edge cases) ==="
