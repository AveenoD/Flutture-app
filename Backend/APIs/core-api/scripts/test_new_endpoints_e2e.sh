#!/usr/bin/env bash
# E2E tests for newly added endpoints: Dashboard, Users list/detail, Qualify with body, Update lead.
# Requires: API running, DB seeded (e.g. madhu@bhoomiplots.com presales, jadish@bhoomiplots.com GM, aparna@bhoomiplots.com manager, lokesh@bhoomiplots.com sales). Password: Test@123456
set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"

echo "=== New endpoints E2E: Dashboard, Users, Qualify (body), Update lead ==="
echo "Base URL: $BASE_URL"

login() {
  local email="$1"
  local res
  res=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
  echo "$res" | jq -r '.data.token // empty' 2>/dev/null || true
}

TOKEN_GM=$(login "jadish@bhoomiplots.com")
TOKEN_MGR=$(login "aparna@bhoomiplots.com")
TOKEN_PS=$(login "madhu@bhoomiplots.com")
TOKEN_SALES=$(login "lokesh@bhoomiplots.com")

if [ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ]; then
  echo "FAIL: Could not get presales token"
  exit 1
fi
echo "Tokens obtained (GM, Manager, Presales, Sales)"

# --- Dashboard ---
echo ""
echo "--- GET /api/v1/dashboard ---"
for role in "GM" "Presales" "Sales"; do
  case "$role" in
    GM)     T="$TOKEN_GM" ;;
    Presales) T="$TOKEN_PS" ;;
    Sales)  T="$TOKEN_SALES" ;;
  esac
  [ -z "$T" ] || [ "$T" = "null" ] && continue
  CODE=$(curl -s -o /tmp/dash.json -w "%{http_code}" "$BASE_URL/api/v1/dashboard" -H "Authorization: Bearer $T")
  if [ "$CODE" != "200" ]; then
    echo "FAIL: Dashboard as $role -> $CODE"
    cat /tmp/dash.json | jq . 2>/dev/null || cat /tmp/dash.json
    exit 1
  fi
  echo "OK: Dashboard $role -> 200 (stats, pipeline)"
done

# Leaderboard: GM/Manager only
echo ""
echo "--- GET /api/v1/dashboard/leaderboard ---"
CODE_GM=$(curl -s -o /tmp/lb.json -w "%{http_code}" "$BASE_URL/api/v1/dashboard/leaderboard" -H "Authorization: Bearer $TOKEN_GM")
if [ "$CODE_GM" != "200" ]; then
  echo "FAIL: Leaderboard as GM -> $CODE_GM"
  exit 1
fi
echo "OK: Leaderboard GM -> 200"
CODE_PS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/dashboard/leaderboard" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE_PS" != "403" ]; then
  echo "FAIL: Leaderboard as Presales expected 403 got $CODE_PS"
  exit 1
fi
echo "OK: Leaderboard Presales -> 403"

# --- Users list and detail ---
echo ""
echo "--- GET /api/v1/users ---"
CODE=$(curl -s -o /tmp/users.json -w "%{http_code}" "$BASE_URL/api/v1/users" -H "Authorization: Bearer $TOKEN_GM")
if [ "$CODE" != "200" ]; then
  echo "FAIL: GET /users as GM -> $CODE"
  cat /tmp/users.json | jq . 2>/dev/null || true
  exit 1
fi
echo "OK: GET /users GM -> 200"
FIRST_USER_ID=$(jq -r '.data.users[0].id // empty' /tmp/users.json)
if [ -n "$FIRST_USER_ID" ] && [ "$FIRST_USER_ID" != "null" ]; then
  CODE=$(curl -s -o /tmp/user_one.json -w "%{http_code}" "$BASE_URL/api/v1/users/$FIRST_USER_ID" -H "Authorization: Bearer $TOKEN_GM")
  if [ "$CODE" != "200" ]; then
    echo "FAIL: GET /users/:id -> $CODE"
    exit 1
  fi
  echo "OK: GET /users/:id -> 200"
fi
CODE_PS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/users" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE_PS" != "403" ]; then
  echo "FAIL: GET /users as Presales expected 403 got $CODE_PS"
  exit 1
fi
echo "OK: GET /users Presales -> 403"

# --- Qualify with body (presales) ---
echo ""
echo "--- POST /api/v1/leads/:id/qualify with body ---"
# Fetch a lead with status=new (fresh/directly assigned) so qualify can run
LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5&status=new" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
# Fallback to called if no new leads
if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ]; then
  LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5&status=called" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
fi
if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ]; then
  echo "SKIP: No lead for presales (qualify with body)"
else
  CODE=$(curl -s -o /tmp/qual.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/qualify" \
    -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
    -d '{"name":"E2E Qualified Lead","budget_min":50.5,"notes":"E2E qualify with profile"}')
  if [ "$CODE" != "200" ]; then
    echo "FAIL: Qualify with body -> $CODE"
    cat /tmp/qual.json | jq . 2>/dev/null || true
    exit 1
  fi
  echo "OK: Qualify with body -> 200"
fi

# --- Update lead PUT (manager has org-wide access, no ownership restriction) ---
echo ""
echo "--- PUT /api/v1/leads/:id ---"
# Use presales-qualified lead (the one just qualified above), or fetch via manager's org view
PUT_LEAD_ID="$LEAD_ID"
# If no lead yet, try to get any lead via manager token (managers can see all leads via GET /leads is presales-only; use the known org lead)
if [ -z "$PUT_LEAD_ID" ] || [ "$PUT_LEAD_ID" = "null" ]; then
  PUT_LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
fi
if [ -n "$PUT_LEAD_ID" ] && [ "$PUT_LEAD_ID" != "null" ]; then
  # Manager can PUT any lead in the org
  CODE=$(curl -s -o /tmp/upd.json -w "%{http_code}" -X PUT "$BASE_URL/api/v1/leads/$PUT_LEAD_ID" \
    -H "Authorization: Bearer $TOKEN_MGR" -H "Content-Type: application/json" \
    -d '{"notes":"Updated via E2E PUT (manager)"}')
  if [ "$CODE" != "200" ]; then
    echo "FAIL: PUT /leads/:id (manager) -> $CODE"
    cat /tmp/upd.json | jq . 2>/dev/null || true
    exit 1
  fi
  echo "OK: PUT /leads/:id (manager) -> 200"
  LEAD_ID="$PUT_LEAD_ID"
fi

# 404 for invalid lead
FAKE_ID="00000000-0000-0000-0000-000000000001"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/leads/$FAKE_ID" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" -d '{"notes":"x"}')
if [ "$CODE" != "404" ]; then
  echo "FAIL: PUT /leads/:id (fake) expected 404 got $CODE"
  exit 1
fi
echo "OK: PUT /leads/:id (fake) -> 404"

echo ""
echo "=== All new endpoint E2E tests passed ==="
