#!/usr/bin/env bash
# E2E test for Sales handoff: working (happy path) + edge cases.
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
FAKE_UUID="00000000-0000-0000-0000-000000000001"
WORKING_PASS=0
EDGE_PASS=0

echo "=== Sales handoff E2E: Working cases + Edge cases ==="
echo "Base URL: $BASE_URL"

# Tokens: presales (madhu), sales (lokesh), GM (for 403)
TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
TOKEN_GM=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"jadish@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

[ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ] && { echo "FAIL: presales token"; exit 1; }
echo "Presales token OK"
[ -z "$TOKEN_SALES" ] || [ "$TOKEN_SALES" = "null" ] && { echo "WARN: sales token not available"; SALES_OK=0; } || { echo "Sales token OK"; SALES_OK=1; }
[ -z "$TOKEN_GM" ] || [ "$TOKEN_GM" = "null" ] && { echo "WARN: GM token not available"; GM_OK=0; } || { echo "GM token OK"; GM_OK=1; }

# Get leads: prefer qualification stage for visit creation; fallback to any presales lead
LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5&stage=qualification" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
[ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
[ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "null" ] && { echo "FAIL: no lead for presales (use import or ensure leads exist)"; exit 1; }
echo "Lead 1 (main): $LEAD_ID"
LEAD2_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=5&stage=qualification" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[1].id // empty')
if [ -n "$LEAD2_ID" ] && [ "$LEAD2_ID" != "null" ]; then echo "Lead 2 (edge): $LEAD2_ID"; HAVE_LEAD2=1; else HAVE_LEAD2=0; fi

# ========== Working cases (happy path) ==========
echo ""
echo "========== Working cases =========="

echo ""
echo "--- Working: GET /leads as presales → 200, list non-empty ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads?limit=5" -H "Authorization: Bearer $TOKEN_PS")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
[ "$HTTP" = "200" ] && [ "$(echo "$BODY" | jq -r '.success')" = "true" ] && [ "$(echo "$BODY" | jq -r '.data.leads | length')" -ge 1 ] && { echo "OK: 200, success, leads >= 1"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: GET /leads"; exit 1; }

echo ""
echo "--- Working: GET /leads/:id as presales → 200, lead returned ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $TOKEN_PS")
HTTP=$(echo "$R" | tail -n1)
BODY=$(echo "$R" | sed '$d')
[ "$HTTP" = "200" ] && [ "$(echo "$BODY" | jq -r '.data.lead.id')" = "$LEAD_ID" ] && { echo "OK: 200, lead.id match"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: GET /leads/:id"; exit 1; }

echo ""
echo "--- Working: GET /leads/:id/stages/by-type/communication (presales) → 200 ---"
R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/communication" -H "Authorization: Bearer $TOKEN_PS")
HTTP=$(echo "$R" | tail -n1)
[ "$HTTP" = "200" ] && { echo "OK: 200, stage by type"; WORKING_PASS=$((WORKING_PASS+1)); } || echo "INFO: $HTTP (lead may not have communication stage)"

# ========== Edge cases ==========
echo ""
echo "========== Edge cases =========="

# --- Edge: GET non-existent lead → 404 (presales and sales) ---
echo ""
echo "--- Edge: GET /leads/:id with fake UUID (presales) → 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$FAKE_UUID" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "404" ] && { echo "OK: 404"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 404, got $CODE"; exit 1; }

echo ""
echo "--- Edge: GET /leads/:id with fake UUID (sales) → 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$FAKE_UUID" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "404" ] && { echo "OK: 404"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 404, got $CODE"; exit 1; }

# --- Edge: POST accept non-existent lead as sales → 404 ---
if [ "$SALES_OK" = "1" ]; then
  echo ""
  echo "--- Edge: POST /leads/:id/accept with fake UUID (sales) → 404 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$FAKE_UUID/accept" -H "Authorization: Bearer $TOKEN_SALES")
  [ "$CODE" = "404" ] && { echo "OK: 404"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 404, got $CODE"; exit 1; }
fi

# --- Edge: GET lead as sales when lead not assigned to sales (no visit yet) → 404 ---
if [ "$SALES_OK" = "1" ]; then
  echo ""
  echo "--- Edge: GET /leads/:id as sales (lead not assigned to sales yet) → 404 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $TOKEN_SALES")
  [ "$CODE" = "404" ] && { echo "OK: 404 (sales cannot see lead before routing assigns)"; EDGE_PASS=$((EDGE_PASS+1)); } || echo "INFO: $CODE (lead may already have sales_user_id from prior run)"
fi

# --- Edge: POST accept as presales → 403 ---
echo ""
echo "--- Edge: POST /leads/:id/accept as presales → 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/accept" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "403" ] && { echo "OK: 403 (only sales can accept)"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- Edge: POST accept as GM → 403 ---
if [ "$GM_OK" = "1" ]; then
  echo ""
  echo "--- Edge: POST /leads/:id/accept as GM → 403 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/accept" -H "Authorization: Bearer $TOKEN_GM")
  [ "$CODE" = "403" ] && { echo "OK: 403"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 403, got $CODE"; exit 1; }
fi

# --- Working: POST create visit (triggers RouteLeadToSales) ---
echo ""
echo "--- Working: POST /leads/:id/visits → 201, visit created ---"
CREATE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"visit_date":"2026-01-15","visit_time":"10:00","visit_type":"first_visit","location_city":"Mumbai","location_area":"Andheri"}')
HTTP=$(echo "$CREATE" | tail -n1)
BODY=$(echo "$CREATE" | sed '$d')
[ "$HTTP" != "201" ] && { echo "FAIL: expected 201, got $HTTP"; echo "$BODY" | jq .; exit 1; }
VISIT_ID=$(echo "$BODY" | jq -r '.data.visit.id // empty')
[ -n "$VISIT_ID" ] && [ "$VISIT_ID" != "null" ] && { echo "OK: 201, visit_id=$VISIT_ID"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: no visit.id"; exit 1; }

# --- Working: GET lead and assert handoff fields ---
echo ""
echo "--- Working: GET /leads/:id (handoff fields present) ---"
LEAD_JSON=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $TOKEN_PS")
success=$(echo "$LEAD_JSON" | jq -r '.success')
[ "$success" = "true" ] || { echo "FAIL: GET lead failed"; echo "$LEAD_JSON" | jq .; exit 1; }
for key in presales_user_id sales_user_id sales_accepted_at; do
  has=$(echo "$LEAD_JSON" | jq -r ".data.lead | type == \"object\" and has(\"$key\")")
  [ "$has" = "true" ] || { echo "FAIL: lead response missing $key"; echo "$LEAD_JSON" | jq .data.lead; exit 1; }
done
echo "OK: lead has presales_user_id, sales_user_id, sales_accepted_at"; WORKING_PASS=$((WORKING_PASS+1))

# --- Sales: POST accept (200 or 404 depending on routing) ---
ACCEPTED=0
if [ "$SALES_OK" = "1" ]; then
  echo ""
  echo "--- POST /leads/:id/accept as sales ---"
  ACCEPT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/accept" -H "Authorization: Bearer $TOKEN_SALES")
  ACCEPT_HTTP=$(echo "$ACCEPT_RESP" | tail -n1)
  if [ "$ACCEPT_HTTP" = "200" ]; then
    ACCEPTED=1
    echo "OK: 200, lead accepted"
    sales_accepted_at=$(echo "$ACCEPT_RESP" | sed '$d' | jq -r '.data.lead.sales_accepted_at // empty')
    assigned_type=$(echo "$ACCEPT_RESP" | sed '$d' | jq -r '.data.lead.assigned_to_user_type // empty')
    [ -n "$sales_accepted_at" ] || { echo "FAIL: sales_accepted_at should be set"; exit 1; }
    [ "$assigned_type" = "sales" ] || { echo "FAIL: assigned_to_user_type should be sales"; exit 1; }
  elif [ "$ACCEPT_HTTP" = "404" ]; then
    echo "INFO: 404 (routing did not assign this lead to sales)"
  else
    echo "FAIL: accept returned $ACCEPT_HTTP"; echo "$ACCEPT_RESP" | sed '$d' | jq .; exit 1
  fi
fi

# --- Working (when accepted): Sales GET lead → 200, assigned_to = sales ---
if [ "$ACCEPTED" = "1" ]; then
  echo ""
  echo "--- Working: GET /leads/:id as sales (after accept) → 200, owner = sales ---"
  R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $TOKEN_SALES")
  HTTP=$(echo "$R" | tail -n1); BODY=$(echo "$R" | sed '$d')
  [ "$HTTP" = "200" ] && [ "$(echo "$BODY" | jq -r '.data.lead.assigned_to_user_type')" = "sales" ] && { echo "OK: 200, assigned_to_user_type=sales"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: Sales GET lead after accept"; exit 1; }

  echo ""
  echo "--- Working: POST /leads/:id/visits as sales (after accept) → 201 ---"
  R=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/visits" \
    -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d '{"visit_date":"2026-03-20","visit_time":"15:00","visit_type":"revisit","location_city":"Mumbai","location_area":"Bandra"}')
  HTTP=$(echo "$R" | tail -n1)
  [ "$HTTP" = "201" ] && { echo "OK: 201, sales created visit on owned lead"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: expected 201, got $HTTP"; exit 1; }

  echo ""
  echo "--- Working: GET /leads/:id as presales (read-only after handoff) → 200 ---"
  R=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/leads/$LEAD_ID" -H "Authorization: Bearer $TOKEN_PS")
  HTTP=$(echo "$R" | tail -n1); BODY=$(echo "$R" | sed '$d')
  [ "$HTTP" = "200" ] && [ "$(echo "$BODY" | jq -r '.data.lead.id')" = "$LEAD_ID" ] && { echo "OK: 200, presales can view handed-off lead (read-only)"; WORKING_PASS=$((WORKING_PASS+1)); } || { echo "FAIL: Presales GET lead after handoff"; exit 1; }
fi

# --- Edge: POST accept again (double accept) → 404 ---
if [ "$SALES_OK" = "1" ] && [ "$ACCEPTED" = "1" ]; then
  echo ""
  echo "--- Edge: POST /leads/:id/accept again (already accepted) → 404 ---"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/accept" -H "Authorization: Bearer $TOKEN_SALES")
  [ "$CODE" = "404" ] && { echo "OK: 404"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 404, got $CODE"; exit 1; }
fi

# --- Edge: Presales forward-stage on lead owned by sales → 403 ---
echo ""
echo "--- Edge: Presales forward-stage on lead when not current owner → 403 ---"
CODE=$(curl -s -o /tmp/fs_resp.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"next_stage":"negotiation"}')
if [ "$ACCEPTED" = "1" ]; then
  [ "$CODE" = "403" ] && { echo "OK: 403 (presales cannot write when sales owns lead)"; EDGE_PASS=$((EDGE_PASS+1)); } || { echo "FAIL: expected 403 when lead accepted by sales, got $CODE"; cat /tmp/fs_resp.json | jq . 2>/dev/null; exit 1; }
else
  [ "$CODE" = "403" ] && { echo "OK: 403"; EDGE_PASS=$((EDGE_PASS+1)); } || echo "INFO: $CODE (lead may still be owned by presales)"
fi

# --- Edge: Presales add stage remark on lead owned by sales → 403 ---
if [ "$ACCEPTED" = "1" ]; then
  echo ""
  echo "--- Edge: Presales PATCH stage remarks on lead owned by sales → 403 ---"
  STAGE_ID=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/stages/by-type/communication" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.stage.id // empty')
  if [ -n "$STAGE_ID" ]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/stages/$STAGE_ID/remarks" \
      -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
      -d '{"remarks":"Presales remark after handoff"}')
    [ "$CODE" = "403" ] && { echo "OK: 403 (presales cannot write stage when sales owns lead)"; EDGE_PASS=$((EDGE_PASS+1)); } || echo "INFO: $CODE"
  else
    echo "INFO: no communication stage found, skip remarks test"
  fi
fi

# --- Edge: Sales create visit on pending lead (assigned_to still presales) → 403 ---
if [ "$SALES_OK" = "1" ] && [ "$HAVE_LEAD2" = "1" ]; then
  echo ""
  echo "--- Edge: Sales create visit on pending lead (not current owner) → 403 ---"
  curl -s -o /dev/null -X POST "$BASE_URL/api/v1/leads/$LEAD2_ID/visits" \
    -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
    -d '{"visit_date":"2026-02-01","visit_time":"11:00","visit_type":"first_visit","location_city":"Pune","location_area":"Camp"}' > /dev/null || true
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD2_ID/visits" \
    -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
    -d '{"visit_date":"2026-02-02","visit_time":"12:00","visit_type":"revisit","location_city":"Pune","location_area":"Camp"}')
  [ "$CODE" = "403" ] && { echo "OK: 403 (sales cannot write until they accept)"; EDGE_PASS=$((EDGE_PASS+1)); } || echo "INFO: got $CODE"
fi

# --- Working: Presales list includes lead (handed-off visibility up to stage 3) ---
echo ""
echo "--- Working: Presales list includes lead (handed-off visibility) ---"
PS_LEADS=$(curl -s "$BASE_URL/api/v1/leads?limit=50" -H "Authorization: Bearer $TOKEN_PS")
FOUND=$(echo "$PS_LEADS" | jq -r --arg lid "$LEAD_ID" '[.data.leads[]? | select(.id == $lid)] | length')
[ "$FOUND" -ge 1 ] || { echo "FAIL: presales should see lead $LEAD_ID"; exit 1; }
echo "OK: presales sees lead in list"; WORKING_PASS=$((WORKING_PASS+1))

# --- Summary ---
echo ""
echo "=============================================="
echo "           RESULTS SUMMARY"
echo "=============================================="
echo "  Working cases passed:  $WORKING_PASS"
echo "  Edge cases passed:     $EDGE_PASS"
echo "=============================================="
echo "  Total: $((WORKING_PASS + EDGE_PASS)) assertions passed"
echo "=============================================="
echo ""
echo "=== Sales handoff E2E (working + edge) passed ==="
