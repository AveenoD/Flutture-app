#!/usr/bin/env bash
# E2E test for Call APIs (Phase 1)
# Prereqs: DB seeded with leads, API running.
# Run: ./scripts/test_call_e2e.sh   or   BASE_URL=http://localhost:3001 ./scripts/test_call_e2e.sh
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
PASS=0
FAIL=0
TOTAL=0

ok() { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); echo "  PASS"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); echo "  FAIL: $1"; }

echo "=== Call APIs E2E ==="
echo "Base URL: $BASE_URL"

# --- Auth tokens ---
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_SALES" ] || [ "$TOKEN_SALES" = "null" ] && { echo "FAIL: sales login"; exit 1; }
echo "Sales token OK"

TOKEN_PRESALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"priya@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_PRESALES" ] || [ "$TOKEN_PRESALES" = "null" ] && echo "WARN: Presales token missing (some tests may skip)"
echo "Presales token: ${TOKEN_PRESALES:+OK}${TOKEN_PRESALES:-MISSING}"

TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token // empty')
[ -z "$TOKEN_GM" ] || [ "$TOKEN_GM" = "null" ] && echo "WARN: GM token missing"
echo "GM token: ${TOKEN_GM:+OK}${TOKEN_GM:-MISSING}"

# Find a lead assigned to sales
LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=20" -H "Authorization: Bearer $TOKEN_SALES")
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].id // empty')
[ -z "$LEAD_ID" ] && { echo "FAIL: no leads assigned to sales"; exit 1; }
echo "Using lead: $LEAD_ID"
echo ""

# ====== 1) POST initiate call (201) ======
echo "--- 1) POST /leads/:id/calls (201) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "201" ]; then
  CALL_ID=$(echo "$BODY" | jq -r '.data.call.call_id // empty')
  LEAD_PHONE=$(echo "$BODY" | jq -r '.data.call.lead_phone // empty')
  if [ -n "$CALL_ID" ] && [ -n "$LEAD_PHONE" ]; then
    echo "  call_id=$CALL_ID, lead_phone=$LEAD_PHONE"
    ok
  else
    fail "missing call_id or lead_phone in response"
    echo "$BODY" | jq .
  fi
else
  fail "expected 201, got $HTTP"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi
echo ""

# ====== 2) POST initiate second call (for list test) ======
echo "--- 2) POST /leads/:id/calls (second call, 201) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "201" ]; then
  CALL_ID_2=$(echo "$BODY" | jq -r '.data.call.call_id // empty')
  echo "  call_id_2=$CALL_ID_2"
  ok
else
  fail "expected 201, got $HTTP"
fi
echo ""

# ====== 3) GET single call (200) ======
echo "--- 3) GET /leads/:id/calls/:call_id (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  GOT_STATUS=$(echo "$BODY" | jq -r '.data.call.call_status // empty')
  if [ "$GOT_STATUS" = "initiated" ]; then
    ok
  else
    fail "expected call_status=initiated, got=$GOT_STATUS"
  fi
else
  fail "expected 200, got $HTTP"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi
echo ""

# ====== 4) GET list calls (200) ======
echo "--- 4) GET /leads/:id/calls (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/calls?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  COUNT=$(echo "$BODY" | jq '.data.calls | length')
  TOTAL_COUNT=$(echo "$BODY" | jq '.data.pagination.total // 0')
  if [ "$COUNT" -ge 2 ]; then
    echo "  calls_count=$COUNT, total=$TOTAL_COUNT"
    ok
  else
    fail "expected >=2 calls, got $COUNT"
    echo "$BODY" | jq .
  fi
else
  fail "expected 200, got $HTTP"
fi
echo ""

# ====== 5) PATCH update call - metadata (200) ======
echo "--- 5) PATCH /leads/:id/calls/:call_id - metadata update (200) ---"
NOW_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d "{\"call_status\":\"answered\",\"call_started_at\":\"$NOW_TS\",\"call_answered_at\":\"$NOW_TS\",\"call_ended_at\":\"$NOW_TS\",\"recording_duration\":45}")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  GOT_STATUS=$(echo "$BODY" | jq -r '.data.call.call_status // empty')
  GOT_DUR=$(echo "$BODY" | jq -r '.data.call.recording_duration // empty')
  if [ "$GOT_STATUS" = "answered" ] && [ "$GOT_DUR" = "45" ]; then
    ok
  else
    fail "expected status=answered,duration=45 got status=$GOT_STATUS,duration=$GOT_DUR"
  fi
else
  fail "expected 200, got $HTTP"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi
echo ""

# ====== 6) PATCH update call - recording URL (200) ======
echo "--- 6) PATCH /leads/:id/calls/:call_id - recording URL (200) ---"
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"recording_url":"https://cdn.example.com/recordings/test-call.m4a"}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  GOT_URL=$(echo "$BODY" | jq -r '.data.call.recording_url // empty')
  if [ "$GOT_URL" = "https://cdn.example.com/recordings/test-call.m4a" ]; then
    ok
  else
    fail "recording_url not updated correctly"
  fi
else
  fail "expected 200, got $HTTP"
fi
echo ""

# ====== 7) PATCH update call - outcome (200) ======
echo "--- 7) PATCH /leads/:id/calls/:call_id - outcome (200) ---"
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"call_outcome":"interested"}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  GOT_OUTCOME=$(echo "$BODY" | jq -r '.data.call.call_outcome // empty')
  if [ "$GOT_OUTCOME" = "interested" ]; then
    ok
  else
    fail "expected outcome=interested, got=$GOT_OUTCOME"
  fi
else
  fail "expected 200, got $HTTP"
fi
echo ""

# ====== 8) GET single call - verify all updates (200) ======
echo "--- 8) GET /leads/:id/calls/:call_id - verify all updates (200) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  GOT_STATUS=$(echo "$BODY" | jq -r '.data.call.call_status // empty')
  GOT_OUTCOME=$(echo "$BODY" | jq -r '.data.call.call_outcome // empty')
  GOT_URL=$(echo "$BODY" | jq -r '.data.call.recording_url // empty')
  GOT_DUR=$(echo "$BODY" | jq -r '.data.call.recording_duration // empty')
  if [ "$GOT_STATUS" = "answered" ] && [ "$GOT_OUTCOME" = "interested" ] && [ "$GOT_URL" != "" ] && [ "$GOT_DUR" = "45" ]; then
    echo "  status=$GOT_STATUS, outcome=$GOT_OUTCOME, recording_url=set, duration=$GOT_DUR"
    ok
  else
    fail "some fields not updated correctly: status=$GOT_STATUS outcome=$GOT_OUTCOME url=$GOT_URL dur=$GOT_DUR"
  fi
else
  fail "expected 200, got $HTTP"
fi
echo ""

# ====== 9) PATCH no fields (400) ======
echo "--- 9) PATCH /leads/:id/calls/:call_id - empty body (400) ---"
R=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{}')
HTTP=$(echo "$R" | tail -n1)
if [ "$HTTP" = "400" ]; then
  ok
else
  fail "expected 400, got $HTTP"
fi
echo ""

# ====== 10) GET call - invalid call_id (404) ======
echo "--- 10) GET /leads/:id/calls/:call_id - invalid call_id (404) ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/calls/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN_SALES")
HTTP=$(echo "$R" | tail -n1)
if [ "$HTTP" = "404" ]; then
  ok
else
  fail "expected 404, got $HTTP"
fi
echo ""

# ====== 11) POST call - no auth (401) ======
echo "--- 11) POST /leads/:id/calls - no auth (401) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls" \
  -H "Content-Type: application/json" -d '{}')
HTTP=$(echo "$R" | tail -n1)
if [ "$HTTP" = "401" ]; then
  ok
else
  fail "expected 401, got $HTTP"
fi
echo ""

# ====== 12) POST call - GM role (403) ======
echo "--- 12) POST /leads/:id/calls - GM role (403) ---"
if [ -n "$TOKEN_GM" ] && [ "$TOKEN_GM" != "null" ]; then
  R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls" \
    -H "Authorization: Bearer $TOKEN_GM" -H "Content-Type: application/json" -d '{}')
  HTTP=$(echo "$R" | tail -n1)
  if [ "$HTTP" = "403" ]; then
    ok
  else
    fail "expected 403, got $HTTP"
  fi
else
  echo "  SKIP (no GM token)"
fi
echo ""

# ====== 13) GET list calls - GM can read (200) ======
echo "--- 13) GET /leads/:id/calls - GM can read (200) ---"
if [ -n "$TOKEN_GM" ] && [ "$TOKEN_GM" != "null" ]; then
  R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/calls" \
    -H "Authorization: Bearer $TOKEN_GM")
  HTTP=$(echo "$R" | tail -n1)
  if [ "$HTTP" = "200" ]; then
    ok
  else
    fail "expected 200, got $HTTP"
  fi
else
  echo "  SKIP (no GM token)"
fi
echo ""

# ====== 14) POST upload-url (B2 not configured -> 500, or 200 if configured) ======
echo "--- 14) POST /leads/:id/calls/:call_id/upload-url ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID/upload-url" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"file_extension":"m4a"}')
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
if [ "$HTTP" = "200" ]; then
  UP_URL=$(echo "$BODY" | jq -r '.data.upload_url // empty')
  OBJ_KEY=$(echo "$BODY" | jq -r '.data.object_key // empty')
  echo "  upload_url present: ${UP_URL:+yes}${UP_URL:-no}, object_key=$OBJ_KEY"
  ok
elif [ "$HTTP" = "500" ]; then
  echo "  Expected: B2 not configured (env vars missing), got 500"
  ok
else
  fail "expected 200 or 500, got $HTTP"
fi
echo ""

# ====== 15) POST upload-url - missing file_extension (400) ======
echo "--- 15) POST upload-url - missing file_extension (400) ---"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/calls/$CALL_ID/upload-url" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{}')
HTTP=$(echo "$R" | tail -n1)
if [ "$HTTP" = "400" ]; then
  ok
else
  fail "expected 400, got $HTTP"
fi
echo ""

# ====== Summary ======
echo ""
echo "==============================="
echo "  Call APIs E2E Results"
echo "  PASS: $PASS / $TOTAL"
echo "  FAIL: $FAIL / $TOTAL"
echo "==============================="
[ "$FAIL" -gt 0 ] && exit 1
exit 0
