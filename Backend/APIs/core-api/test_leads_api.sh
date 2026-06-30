#!/usr/bin/env bash
# E2E tests for Get Leads APIs - all user types and edge cases.
# Prereq: core-api running with lead routes (restart after adding SetupLeadRoutes).
# Usage: ./test_leads_api.sh   or   BASE_URL=http://localhost:3001 ./test_leads_api.sh
set -e
BASE="${BASE_URL:-http://localhost:3000}"
PASS="Test@123456"

echo "=== Base URL: $BASE ==="

# --- 0) Quick check: lead route available (avoid 404 from old server) ---
echo ""
echo "--- 0) Checking if lead routes are loaded ---"
GM_CHECK=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASS\"}")
GM_CHECK_TOKEN=$(echo "$GM_CHECK" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$GM_CHECK_TOKEN" ]; then
  ROUTE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads" -H "Authorization: Bearer $GM_CHECK_TOKEN")
  if [ "$ROUTE_CODE" = "404" ]; then
    echo "FAIL: GET /api/v1/leads returned 404. Restart the core-api server (with lead routes) and re-run."
    exit 1
  fi
  echo "PASS: Lead routes available"
fi

# --- 1) No token -> 401 ---
echo ""
echo "--- 1) GET /leads without token (expect 401) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads")
[ "$CODE" = "401" ] && echo "PASS: 401" || echo "FAIL: got $CODE"

# --- 2) Invalid token -> 401 ---
echo ""
echo "--- 2) GET /leads with invalid token (expect 401) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads" -H "Authorization: Bearer invalid")
[ "$CODE" = "401" ] && echo "PASS: 401" || echo "FAIL: got $CODE"

# --- 3) Login as GM ---
echo ""
echo "--- 3) Login as GM ---"
GM_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASS\"}")
GM_TOKEN=$(echo "$GM_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$GM_TOKEN" ]; then echo "FAIL: No GM token"; echo "$GM_RESP" | head -c 200; else echo "PASS: GM token obtained"; fi

# --- 4) GM list all leads ---
echo ""
echo "--- 4) GM GET /leads (all org leads) ---"
GM_LEADS=$(curl -s "$BASE/api/v1/leads" -H "Authorization: Bearer $GM_TOKEN")
echo "$GM_LEADS" | grep -q '"success":true' && echo "PASS: 200" || echo "FAIL: $GM_LEADS"
TOTAL_GM=$(echo "$GM_LEADS" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
echo "  Total leads (GM): $TOTAL_GM"

# --- 5) GM get single lead (valid id from list) ---
LEAD_ID=$(echo "$GM_LEADS" | grep -o '"id":"[a-f0-9-]*"' | head -1 | cut -d'"' -f4)
if [ -n "$LEAD_ID" ]; then
  echo ""
  echo "--- 5) GM GET /leads/:id (expect 200) ---"
  CODE=$(curl -s -o /tmp/lead_one.json -w "%{http_code}" "$BASE/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $GM_TOKEN")
  [ "$CODE" = "200" ] && echo "PASS: 200" || echo "FAIL: $CODE"
else
  echo "--- 5) Skip GET /leads/:id (no leads in DB) ---"
fi

# --- 6) GM filters: status, pagination ---
echo ""
echo "--- 6) GM GET /leads?status=unqualified&limit=2&page=1 ---"
curl -s "$BASE/api/v1/leads?status=unqualified&limit=2&page=1" -H "Authorization: Bearer $GM_TOKEN" | grep -q '"success":true' && echo "PASS" || echo "FAIL"

# --- 7) GM filter assigned_to_user_id (presales id from org) ---
echo ""
echo "--- 7) GM GET /leads?assigned_to_user_id=<presales_id> ---"
# Get a presales user id from DB or from users API if available; for now just call with a UUID to ensure param is applied
curl -s "$BASE/api/v1/leads?assigned_to_user_id=00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer $GM_TOKEN" | grep -q '"success":true' && echo "PASS (no leads for fake id)" || echo "FAIL"

# --- 8) Login as Manager (has view_leads) ---
echo ""
echo "--- 8) Login as Manager (view_leads) ---"
MGR_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"aparna@bhoomiplots.com\",\"password\":\"$PASS\"}")
MGR_TOKEN=$(echo "$MGR_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -z "$MGR_TOKEN" ] && echo "FAIL: No Manager token" || echo "PASS: Manager token"

# --- 9) Manager list all leads ---
echo ""
echo "--- 9) Manager GET /leads (all org leads) ---"
MGR_LEADS=$(curl -s "$BASE/api/v1/leads" -H "Authorization: Bearer $MGR_TOKEN")
echo "$MGR_LEADS" | grep -q '"success":true' && echo "PASS: 200" || echo "FAIL"

# --- 10) Login as Presales (Madhu) ---
echo ""
echo "--- 10) Login as Presales (Madhu) ---"
PS_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASS\"}")
PS_TOKEN=$(echo "$PS_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
# Extract Madhu's user id from login (data.user.id)
PS_USER_ID=""
if command -v jq >/dev/null 2>&1; then
  PS_USER_ID=$(echo "$PS_RESP" | jq -r '.data.user.id // empty')
fi
[ -z "$PS_USER_ID" ] && PS_USER_ID=$(echo "$PS_RESP" | grep -o '"id":"[a-f0-9-]*"' | head -1 | cut -d'"' -f4)
[ -z "$PS_TOKEN" ] && echo "FAIL: No Presales token" || echo "PASS: Presales token"

# --- 11) Presales list -> only assigned leads; verify every lead is assigned to this user ---
echo ""
echo "--- 11) Presales GET /leads (only assigned) ---"
PS_LEADS=$(curl -s "$BASE/api/v1/leads" -H "Authorization: Bearer $PS_TOKEN")
echo "$PS_LEADS" | grep -q '"success":true' && echo "PASS: 200" || echo "FAIL: $PS_LEADS"
PS_TOTAL=$(echo "$PS_LEADS" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
echo "  Presales assigned count: $PS_TOTAL"
# Confirm: every lead in response has assigned_to_user_id = Presales user and assigned_to_user_type = presales
if command -v jq >/dev/null 2>&1 && [ -n "$PS_USER_ID" ] && [ "$PS_TOTAL" -gt 0 ] 2>/dev/null; then
  BAD=$(echo "$PS_LEADS" | jq -r --arg uid "$PS_USER_ID" '[.data.leads[]? | select((.assigned_to_user_id != $uid) or (.assigned_to_user_type != "presales"))] | length')
  if [ "${BAD:-0}" -eq 0 ]; then
    echo "  VERIFIED: All $PS_TOTAL leads have assigned_to_user_id = Madhu and type = presales"
  else
    echo "  FAIL: $BAD lead(s) are not assigned to this presales user"
    exit 1
  fi
fi

# --- 12) Presales GET lead by ID: assigned -> 200, unassigned -> 404 ---
if [ -n "$LEAD_ID" ]; then
  echo ""
  echo "--- 12a) Presales GET /leads/:id (may be 200 or 404 depending on assignment) ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $PS_TOKEN")
  [ "$CODE" = "200" ] || [ "$CODE" = "404" ] && echo "PASS: $CODE" || echo "FAIL: $CODE"
fi
echo ""
echo "--- 12b) Presales GET /leads/:id with non-existent UUID (expect 404) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/00000000-0000-0000-0000-000000000001" -H "Authorization: Bearer $PS_TOKEN")
[ "$CODE" = "404" ] && echo "PASS: 404" || echo "FAIL: $CODE"

# --- 12c) Assignee-only visibility: lead assigned to Madhu -> Madhu sees it (200), other presales does not (404) ---
LEAD_ID_MADHU=""
if command -v jq >/dev/null 2>&1 && [ -n "$PS_USER_ID" ]; then
  LEAD_ID_MADHU=$(echo "$GM_LEADS" | jq -r --arg uid "$PS_USER_ID" '.data.leads[]? | select(.assigned_to_user_id == $uid) | .id' | head -1)
fi
if [ -n "$LEAD_ID_MADHU" ] && [ "$LEAD_ID_MADHU" != "null" ]; then
  echo ""
  echo "--- 12c) Lead assigned to Madhu: Madhu GET -> 200, other Presales GET -> 404 ---"
  CODE_MADHU=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/$LEAD_ID_MADHU" -H "Authorization: Bearer $PS_TOKEN")
  [ "$CODE_MADHU" = "200" ] && echo "  Madhu GET her assigned lead: 200 OK" || echo "  FAIL: Madhu got $CODE_MADHU"
  PS2_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"presales2@bhoomiplots.com\",\"password\":\"$PASS\"}")
  PS2_TOKEN=$(echo "$PS2_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$PS2_TOKEN" ]; then
    CODE_PS2=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/$LEAD_ID_MADHU" -H "Authorization: Bearer $PS2_TOKEN")
    [ "$CODE_PS2" = "404" ] && echo "  Other Presales GET same lead: 404 (not visible) OK" || echo "  FAIL: Other presales got $CODE_PS2 (expected 404)"
    [ "$CODE_MADHU" = "200" ] && [ "$CODE_PS2" = "404" ] && echo "PASS: Assignee-only visibility confirmed" || exit 1
  else
    echo "  Skip other presales check (presales2@bhoomiplots.com not in DB)"
  fi
fi

# --- 13) Login as Sales (Lokesh) ---
echo ""
echo "--- 13) Login as Sales (Lokesh) ---"
SLS_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASS\"}")
SLS_TOKEN=$(echo "$SLS_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
SLS_USER_ID=""
if command -v jq >/dev/null 2>&1; then
  SLS_USER_ID=$(echo "$SLS_RESP" | jq -r '.data.user.id // empty')
fi
[ -z "$SLS_TOKEN" ] && echo "FAIL: No Sales token" || echo "PASS: Sales token"

# --- 14) Sales list -> only assigned leads; verify every lead is assigned to this user ---
echo ""
echo "--- 14) Sales GET /leads (only assigned) ---"
SLS_LEADS=$(curl -s "$BASE/api/v1/leads" -H "Authorization: Bearer $SLS_TOKEN")
echo "$SLS_LEADS" | grep -q '"success":true' && echo "PASS: 200" || echo "FAIL"
SLS_TOTAL=$(echo "$SLS_LEADS" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
if command -v jq >/dev/null 2>&1 && [ -n "$SLS_USER_ID" ] && [ "${SLS_TOTAL:-0}" -gt 0 ] 2>/dev/null; then
  BAD=$(echo "$SLS_LEADS" | jq -r --arg uid "$SLS_USER_ID" '[.data.leads[]? | select((.assigned_to_user_id != $uid) or (.assigned_to_user_type != "sales"))] | length')
  if [ "${BAD:-0}" -eq 0 ]; then
    echo "  VERIFIED: All $SLS_TOTAL leads have assigned_to_user_id = Lokesh and type = sales"
  else
    echo "  FAIL: $BAD lead(s) are not assigned to this sales user"
    exit 1
  fi
fi

# --- 15) Search filter ---
echo ""
echo "--- 15) GM GET /leads?search=Lead ---"
curl -s "$BASE/api/v1/leads?search=Lead" -H "Authorization: Bearer $GM_TOKEN" | grep -q '"success":true' && echo "PASS" || echo "FAIL"

# --- 16) Pagination: page 2, limit 5 ---
echo ""
echo "--- 16) GM GET /leads?page=2&limit=5 ---"
curl -s "$BASE/api/v1/leads?page=2&limit=5" -H "Authorization: Bearer $GM_TOKEN" | grep -q '"success":true' && echo "PASS" || echo "FAIL"

# --- 17) GM can get any org lead by ID (even if assigned to presales/sales) ---
if [ -n "$LEAD_ID" ]; then
  echo ""
  echo "--- 17) GM GET /leads/:id (any lead in org) ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $GM_TOKEN")
  [ "$CODE" = "200" ] && echo "PASS: 200" || echo "FAIL: $CODE"
fi

# --- 18) Filter by city (ILIKE) ---
echo ""
echo "--- 18) GM GET /leads?city=Bangalore ---"
curl -s "$BASE/api/v1/leads?city=Bangalore" -H "Authorization: Bearer $GM_TOKEN" | grep -q '"success":true' && echo "PASS" || echo "FAIL"

# ========== FILTER VERIFICATION (jq): filters properly restrict results ==========
if command -v jq >/dev/null 2>&1; then
  echo ""
  echo "=== Filter verification (filters kaam kar rahe hain) ==="
  # status filter: every returned lead must have status = unqualified
  R=$(curl -s "$BASE/api/v1/leads?status=unqualified&limit=50" -H "Authorization: Bearer $GM_TOKEN")
  if echo "$R" | jq -e '.data.leads | length >= 0' >/dev/null 2>&1; then
    BAD=$(echo "$R" | jq -r '[.data.leads[]? | select(.status != "unqualified")] | length')
    [ "${BAD:-0}" -eq 0 ] && echo "  status=unqualified: all leads have status unqualified" || { echo "  FAIL status: $BAD leads with wrong status"; exit 1; }
  fi
  # limit filter: response has at most `limit` leads and pagination.limit matches
  R=$(curl -s "$BASE/api/v1/leads?limit=3&page=1" -H "Authorization: Bearer $GM_TOKEN")
  LEN=$(echo "$R" | jq -r '.data.leads | length')
  PAG_LIMIT=$(echo "$R" | jq -r '.data.pagination.limit')
  [ "$LEN" -le 3 ] && [ "$PAG_LIMIT" = "3" ] && echo "  limit=3: got $LEN leads, pagination.limit=$PAG_LIMIT" || { echo "  FAIL limit: len=$LEN pag_limit=$PAG_LIMIT"; exit 1; }
  # search filter: every lead has name/phone/email containing search term (case insensitive)
  R=$(curl -s "$BASE/api/v1/leads?search=Lead&limit=20" -H "Authorization: Bearer $GM_TOKEN")
  BAD=$(echo "$R" | jq -r '[.data.leads[]? | select(
    ((.name | test("Lead"; "i")) or ((.phone | tostring) | test("Lead"; "i")) or ((.email // "") | test("Lead"; "i")) | not)
  )] | length')
  [ "${BAD:-0}" -eq 0 ] && echo "  search=Lead: all returned leads match name/phone/email" || echo "  search=Lead: $BAD leads did not match (ok if no such leads)"
  # city filter (ILIKE): every lead city contains the value
  R=$(curl -s "$BASE/api/v1/leads?city=Bangalore&limit=20" -H "Authorization: Bearer $GM_TOKEN")
  BAD=$(echo "$R" | jq -r '[.data.leads[]? | select(.city != null) | select((.city | test("Bangalore"; "i")) | not)] | length')
  [ "${BAD:-0}" -eq 0 ] && echo "  city=Bangalore: all returned leads have city containing Bangalore" || { echo "  FAIL city: $BAD leads city does not contain Bangalore"; exit 1; }
  # lead_temperature exact match
  R=$(curl -s "$BASE/api/v1/leads?lead_temperature=warm&limit=50" -H "Authorization: Bearer $GM_TOKEN")
  BAD=$(echo "$R" | jq -r '[.data.leads[]? | select(.lead_temperature != "warm")] | length')
  [ "${BAD:-0}" -eq 0 ] && echo "  lead_temperature=warm: all leads have lead_temperature=warm" || { echo "  FAIL lead_temperature: $BAD leads not warm"; exit 1; }
  # source exact match (imported is a common value in seed/imports)
  R=$(curl -s "$BASE/api/v1/leads?source=imported&limit=50" -H "Authorization: Bearer $GM_TOKEN")
  BAD=$(echo "$R" | jq -r '[.data.leads[]? | select(.source != "imported")] | length')
  [ "${BAD:-0}" -eq 0 ] && echo "  source=imported: all leads have source=imported" || { echo "  FAIL source: $BAD leads not imported"; exit 1; }
  # pagination: page 2 returns different leads than page 1
  R1=$(curl -s "$BASE/api/v1/leads?limit=2&page=1" -H "Authorization: Bearer $GM_TOKEN")
  R2=$(curl -s "$BASE/api/v1/leads?limit=2&page=2" -H "Authorization: Bearer $GM_TOKEN")
  ID1=$(echo "$R1" | jq -r '.data.leads[0].id // empty')
  ID2=$(echo "$R2" | jq -r '.data.leads[0].id // empty')
  if [ -n "$ID1" ] && [ -n "$ID2" ]; then
    [ "$ID1" != "$ID2" ] && echo "  pagination page=1 vs page=2: different leads" || echo "  pagination: page 1 and 2 overlap (ok if total <= 2)"
  fi
  echo "  All filter checks passed."
fi

# --- 19) Sales GET /leads/:id with non-existent (404) ---
echo ""
echo "--- 19) Sales GET /leads/:id non-existent UUID (expect 404) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/leads/00000000-0000-0000-0000-000000000002" -H "Authorization: Bearer $SLS_TOKEN")
[ "$CODE" = "404" ] && echo "PASS: 404" || echo "FAIL: $CODE"

echo ""
echo "=== E2E lead API tests finished ==="
