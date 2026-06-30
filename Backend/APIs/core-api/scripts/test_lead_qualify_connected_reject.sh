#!/usr/bin/env bash
# Test script for Lead Qualify, Connected, and Reject APIs (and GET rejection-questions).
# Covers: 401 (no/invalid token), 403 (wrong role), 404 (lead not found), 400 (bad body), 200 (success).
# Prerequisites: API running (e.g. PORT=3000), DB seeded with seed.sql (presales/sales users + rejection_questions).
# Seed users: madhu@bhoomiplots.com (presales), lokesh@bhoomiplots.com (sales), aparna@bhoomiplots.com (manager). Password: Test@123456

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
# Non-existent lead ID for 404 tests
FAKE_LEAD_ID="00000000-0000-0000-0000-000000000001"

echo "=== Base URL: $BASE_URL ==="

# Optional: fail fast if server is unreachable
if ! curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$BASE_URL/health" | grep -q 200; then
  echo "Warning: $BASE_URL/health did not return 200. Is the API running?"
fi

# --- Login and get tokens ---
login() {
  local email="$1"
  local res
  res=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
  if ! echo "$res" | jq -e . >/dev/null 2>&1; then
    echo "Login response (not JSON): ${res:0:200}"
    echo ""
    return 1
  fi
  echo "$res" | jq -r '.data.token // empty'
}

echo ""
echo "--- Logging in (presales, sales, manager) ---"
TOKEN_PRESALES=$(login "madhu@bhoomiplots.com")
TOKEN_SALES=$(login "lokesh@bhoomiplots.com")
TOKEN_MANAGER=$(login "aparna@bhoomiplots.com")

if [ -z "$TOKEN_PRESALES" ]; then
  echo "Failed to get presales token. Check DB seed and credentials."
  exit 1
fi
if [ -z "$TOKEN_SALES" ]; then
  echo "Failed to get sales token."
  exit 1
fi
echo "Presales and Sales tokens obtained."
if [ -z "$TOKEN_MANAGER" ]; then
  echo "Manager token empty (optional for 403 tests)."
fi

# --- Helper: run curl and assert status ---
assert_status() {
  local expected="$1"
  local actual="$2"
  local name="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  OK: $name -> $actual"
  else
    echo "  FAIL: $name expected HTTP $expected got $actual"
    return 1
  fi
}

# --- 1) Qualify ---
echo ""
echo "=== 1) POST /api/v1/leads/:id/qualify ==="

# 1a) No token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/qualify")
assert_status "401" "$code" "No auth -> 401"

# 1b) Invalid token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/qualify" \
  -H "Authorization: Bearer invalid-token")
assert_status "401" "$code" "Invalid token -> 401"

# 1c) Sales calling qualify -> 403 (only presales)
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/qualify" \
  -H "Authorization: Bearer $TOKEN_SALES")
assert_status "403" "$code" "Sales qualify -> 403"

# 1d) Presales, lead not found / not assigned -> 404
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/qualify" \
  -H "Authorization: Bearer $TOKEN_PRESALES")
assert_status "404" "$code" "Presales qualify non-existent lead -> 404"

# 1e) Presales, missing id in path (use invalid) -> 404 (or 400 if validated earlier)
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/qualify" \
  -H "Authorization: Bearer $TOKEN_PRESALES")
assert_status "404" "$code" "Presales qualify fake ID -> 404"

# 1f) Presales, valid lead -> 200 (find a lead currently assigned to presales in qualification/communication)
LEAD_ID_FOR_QUALIFY=""
# Try by-stage to get a lead presales currently owns
for s in qualification communication; do
  LEAD_ID_FOR_QUALIFY=$(curl -s "$BASE_URL/api/v1/leads/by-stage/$s?limit=20" -H "Authorization: Bearer $TOKEN_PRESALES" | jq -r '.data.leads[0].lead.id // empty')
  [ -n "$LEAD_ID_FOR_QUALIFY" ] && break
done
if [ -n "$LEAD_ID_FOR_QUALIFY" ]; then
  code=$(curl -s -o /tmp/qualify_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID_FOR_QUALIFY/qualify" \
    -H "Authorization: Bearer $TOKEN_PRESALES")
  assert_status "200" "$code" "Presales qualify valid lead -> 200"
  echo "  Response: $(jq -c '.data.lead | {id, status}' /tmp/qualify_resp.json 2>/dev/null || cat /tmp/qualify_resp.json)"
else
  echo "  SKIP: No lead currently owned by presales in qualification/communication; cannot test 200 for qualify."
fi

# --- 2) Connected ---
echo ""
echo "=== 2) POST /api/v1/leads/:id/connected ==="

# 2a) No token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/connected")
assert_status "401" "$code" "No auth -> 401"

# 2b) Sales calling connected -> 403
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/connected" \
  -H "Authorization: Bearer $TOKEN_SALES")
assert_status "403" "$code" "Sales connected -> 403"

# 2c) Presales, lead not found -> 404
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/connected" \
  -H "Authorization: Bearer $TOKEN_PRESALES")
assert_status "404" "$code" "Presales connected non-existent lead -> 404"

# 2d) Presales, valid lead -> 200 (reuse lead if we have one; may be qualified now)
if [ -n "$LEAD_ID_FOR_QUALIFY" ]; then
  code=$(curl -s -o /tmp/connected_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID_FOR_QUALIFY/connected" \
    -H "Authorization: Bearer $TOKEN_PRESALES")
  assert_status "200" "$code" "Presales connected valid lead -> 200"
  echo "  Response: $(jq -c '.data.lead | {id, status}' /tmp/connected_resp.json 2>/dev/null || cat /tmp/connected_resp.json)"
else
  echo "  SKIP: No lead; cannot test 200 for connected."
fi

# --- 3) GET rejection-questions ---
echo ""
echo "=== 3) GET /api/v1/rejection-questions ==="

# 3a) No token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/rejection-questions")
assert_status "401" "$code" "No auth -> 401"

# 3b) Manager -> 403 (only presales/sales)
if [ -n "$TOKEN_MANAGER" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/rejection-questions" \
    -H "Authorization: Bearer $TOKEN_MANAGER")
  assert_status "403" "$code" "Manager rejection-questions -> 403"
fi

# 3c) Presales -> 200
code=$(curl -s -o /tmp/rq_presales.json -w "%{http_code}" "$BASE_URL/api/v1/rejection-questions" \
  -H "Authorization: Bearer $TOKEN_PRESALES")
assert_status "200" "$code" "Presales rejection-questions -> 200"
count=$(jq '.data.questions | length' /tmp/rq_presales.json 2>/dev/null || echo "0")
echo "  Questions count: $count"

# 3d) Sales -> 200
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/rejection-questions" \
  -H "Authorization: Bearer $TOKEN_SALES")
assert_status "200" "$code" "Sales rejection-questions -> 200"

# 3e) Optional category filter
code=$(curl -s -o /tmp/rq_budget.json -w "%{http_code}" "$BASE_URL/api/v1/rejection-questions?category=budget" \
  -H "Authorization: Bearer $TOKEN_PRESALES")
assert_status "200" "$code" "Presales rejection-questions?category=budget -> 200"
echo "  Budget questions: $(jq '.data.questions | length' /tmp/rq_budget.json 2>/dev/null)"

# Get first question id for reject body (for valid reject test)
FIRST_QUESTION_ID=$(jq -r '.data.questions[0].id // empty' /tmp/rq_presales.json)
FIRST_OPTION=$(jq -r '.data.questions[0].options[0] // "Yes"' /tmp/rq_presales.json)

# --- 4) POST reject ---
echo ""
echo "=== 4) POST /api/v1/leads/:id/reject ==="

# 4a) No token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
  -H "Content-Type: application/json" \
  -d '{"questions_response":[{"question_id":"'"$FAKE_LEAD_ID"'","answer":"Yes"}]}')
assert_status "401" "$code" "No auth -> 401"

# 4b) Manager -> 403
if [ -n "$TOKEN_MANAGER" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
    -H "Authorization: Bearer $TOKEN_MANAGER" \
    -H "Content-Type: application/json" \
    -d '{"questions_response":[{"question_id":"'"$FAKE_LEAD_ID"'","answer":"Yes"}]}')
  assert_status "403" "$code" "Manager reject -> 403"
fi

# 4c) Invalid body (empty questions_response) -> 400
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
  -H "Authorization: Bearer $TOKEN_PRESALES" \
  -H "Content-Type: application/json" \
  -d '{"questions_response":[]}')
assert_status "400" "$code" "Empty questions_response -> 400"

# 4d) Invalid body (missing questions_response) -> 400
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
  -H "Authorization: Bearer $TOKEN_PRESALES" \
  -H "Content-Type: application/json" \
  -d '{}')
assert_status "400" "$code" "Missing questions_response -> 400"

# 4e) Lead not found / not assigned -> 404
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
  -H "Authorization: Bearer $TOKEN_PRESALES" \
  -H "Content-Type: application/json" \
  -d '{"questions_response":[{"question_id":"'"${FIRST_QUESTION_ID:-$FAKE_LEAD_ID}"'","answer":"Yes"}]}')
assert_status "404" "$code" "Presales reject non-existent lead -> 404"

# 4f) Sales reject (same 404 for fake id)
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_LEAD_ID/reject" \
  -H "Authorization: Bearer $TOKEN_SALES" \
  -H "Content-Type: application/json" \
  -d '{"questions_response":[{"question_id":"'"${FIRST_QUESTION_ID:-$FAKE_LEAD_ID}"'","answer":"Yes"}]}')
assert_status "404" "$code" "Sales reject non-existent lead -> 404"

# 4g) Valid reject (presales or sales) -> 200 when we have a lead assigned
LEAD_ID_FOR_REJECT=""
sales_leads=$(curl -s -X GET "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_SALES")
LEAD_ID_FOR_REJECT=$(echo "$sales_leads" | jq -r '.data.leads[0].id // empty')
if [ -z "$LEAD_ID_FOR_REJECT" ]; then
  LEAD_ID_FOR_REJECT=$(echo "$first_lead" | jq -r '.data.leads[0].id // empty')
fi
if [ -n "$LEAD_ID_FOR_REJECT" ] && [ -n "$FIRST_QUESTION_ID" ]; then
  code=$(curl -s -o /tmp/reject_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID_FOR_REJECT/reject" \
    -H "Authorization: Bearer $TOKEN_SALES" \
    -H "Content-Type: application/json" \
    -d '{"questions_response":[{"question_id":"'"$FIRST_QUESTION_ID"'","answer":"'"$FIRST_OPTION"'"}],"ai_summary":"Test reject","ai_bullet_points":["point1"]}')
  assert_status "200" "$code" "Sales reject valid lead -> 200"
  echo "  Response: $(jq -c '.data | {lead_id, rejection_id, lead: .lead.status}' /tmp/reject_resp.json 2>/dev/null || cat /tmp/reject_resp.json)"
else
  echo "  SKIP: No lead or no question id; cannot test 200 for reject."
fi

echo ""
echo "=== All tests completed ==="
