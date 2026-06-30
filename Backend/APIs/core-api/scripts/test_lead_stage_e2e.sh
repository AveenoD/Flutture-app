#!/usr/bin/env bash
# E2E test for GET /leads/by-stage/:stage and POST /leads/:id/forward-stage
# Presales only. Requires: API running, DB with presales user and leads.
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"

echo "=== Lead by-stage & forward-stage E2E ==="
echo "Base URL: $BASE_URL"

# Login presales (Madhu)
TOKEN_PS=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')
if [ -z "$TOKEN_PS" ] || [ "$TOKEN_PS" = "null" ]; then
  echo "FAIL: Could not get presales token"
  exit 1
fi
echo "Presales token obtained"

# Login sales (for 403 test)
TOKEN_SALES=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"lokesh@bhoomiplots.com\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

# Get first lead assigned to presales (qualification or any stage)
LEAD_RESP=$(curl -s "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_PS")
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].id // empty')
if [ -z "$LEAD_ID" ]; then
  echo "FAIL: No lead found for presales. Create a lead first."
  exit 1
fi
CURRENT_STAGE=$(echo "$LEAD_RESP" | jq -r '.data.leads[0].stage // "qualification"')
echo "Using lead $LEAD_ID (current stage: $CURRENT_STAGE)"

# --- 1) GET /leads/by-stage/:stage ---
echo ""
echo "--- 1) GET /leads/by-stage/qualification ---"
CODE=$(curl -s -o /tmp/by_stage.json -w "%{http_code}" "$BASE_URL/api/v1/leads/by-stage/qualification" -H "Authorization: Bearer $TOKEN_PS")
if [ "$CODE" != "200" ]; then
  echo "FAIL: expected 200, got $CODE"
  cat /tmp/by_stage.json | jq . 2>/dev/null || cat /tmp/by_stage.json
  exit 1
fi
echo "OK: 200"
echo "  Leads count: $(jq '.data.leads | length' /tmp/by_stage.json), pagination: $(jq -c '.data.pagination' /tmp/by_stage.json)"

echo ""
echo "--- 2) GET /leads/by-stage/communication ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/by-stage/communication" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "200" ] && echo "OK: 200" || { echo "FAIL: $CODE"; exit 1; }

echo ""
echo "--- 3) GET /leads/by-stage/property_visit ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/by-stage/property_visit" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "200" ] && echo "OK: 200" || { echo "FAIL: $CODE"; exit 1; }

echo ""
echo "--- 4) GET /leads/by-stage invalid stage -> 400 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/by-stage/invalid" -H "Authorization: Bearer $TOKEN_PS")
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

echo ""
echo "--- 5) Sales GET by-stage -> 403 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/leads/by-stage/qualification" -H "Authorization: Bearer $TOKEN_SALES")
[ "$CODE" = "403" ] && echo "OK: 403" || { echo "FAIL: expected 403, got $CODE"; exit 1; }

# --- 6) POST forward-stage ---
# If lead is in qualification, forward to communication; else if communication, forward to property_visit
echo ""
echo "--- 6) POST /leads/:id/forward-stage ---"

if [ "$CURRENT_STAGE" = "qualification" ] || [ "$CURRENT_STAGE" = "null" ] || [ -z "$CURRENT_STAGE" ]; then
  NEXT="communication"
elif [ "$CURRENT_STAGE" = "communication" ]; then
  NEXT="property_visit"
else
  echo "  Lead already in $CURRENT_STAGE; skipping forward to avoid invalid transition"
  NEXT=""
fi

if [ -n "$NEXT" ]; then
  CODE=$(curl -s -o /tmp/fwd.json -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
    -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
    -d "{\"next_stage\":\"$NEXT\",\"remarks\":\"E2E test forward\"}")
  if [ "$CODE" != "200" ]; then
    echo "FAIL: forward-stage expected 200, got $CODE"
    cat /tmp/fwd.json | jq . 2>/dev/null || cat /tmp/fwd.json
    exit 1
  fi
  NEW_STAGE=$(jq -r '.data.lead.stage' /tmp/fwd.json)
  echo "OK: 200, lead stage after forward: $NEW_STAGE (requested: $NEXT)"
fi

# --- 6b) PATCH add stage remarks (need a lead + stage_id)
echo ""
echo "--- 6b) PATCH /leads/:id/stages/:stage_id/remarks ---"
# Get a stage_id: from by-stage response (first lead that has stage_remarks), or use current lead's stage after forward
STAGE_ID=""
for stage in qualification communication property_visit; do
  BY_STAGE=$(curl -s "$BASE_URL/api/v1/leads/by-stage/$stage" -H "Authorization: Bearer $TOKEN_PS")
  STAGE_ID=$(echo "$BY_STAGE" | jq -r --arg lid "$LEAD_ID" '.data.leads[] | select(.lead.id == $lid) | .stage_remarks[0].stage_id // empty')
  [ -n "$STAGE_ID" ] && break
  STAGE_ID=$(echo "$BY_STAGE" | jq -r '.data.leads[0].stage_remarks[0].stage_id // empty')
  [ -n "$STAGE_ID" ] && break
done
if [ -n "$STAGE_ID" ]; then
  CODE=$(curl -s -o /tmp/remarks.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/stages/$STAGE_ID/remarks" \
    -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
    -d '{"remarks":"E2E test remark on stage"}')
  if [ "$CODE" != "200" ]; then
    echo "FAIL: PATCH stage remarks expected 200, got $CODE"
    cat /tmp/remarks.json | jq . 2>/dev/null || cat /tmp/remarks.json
    exit 1
  fi
  echo "OK: 200, stage remarks updated: $(jq -r '.data.stage.remarks' /tmp/remarks.json)"
else
  echo "SKIP: No stage_id found (no stage_remarks in by-stage response)"
fi

echo ""
echo "--- 7) POST forward-stage invalid next_stage -> 400 ---"
# qualification is not a valid "next" from any stage (cannot go back)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"next_stage":"qualification"}')
[ "$CODE" = "400" ] && echo "OK: 400" || { echo "FAIL: expected 400, got $CODE"; exit 1; }

echo ""
echo "--- 8) POST forward-stage fake lead -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/00000000-0000-0000-0000-000000000001/forward-stage" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"next_stage":"communication"}')
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

echo ""
echo "--- 9) Sales POST forward-stage on presales lead -> 403/404 (forbidden or not visible) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/leads/$LEAD_ID/forward-stage" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"next_stage":"communication"}')
( [ "$CODE" = "403" ] || [ "$CODE" = "404" ] ) && echo "OK: $CODE (Sales cannot forward presales lead)" || { echo "FAIL: expected 403 or 404, got $CODE"; exit 1; }

echo ""
echo "--- 10) PATCH stage remarks: Sales on non-PV presales lead -> 403/404 (forbidden or not visible) ---"
# STAGE_ID from 6b is from presales lead. Sales gets 404 (lead not visible) or 403 (lead visible but not PV stage).
[ -n "$STAGE_ID" ] && CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/stages/$STAGE_ID/remarks" \
  -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
  -d '{"remarks":"Sales cannot add on non-PV"}') || CODE="SKIP"
if [ "$CODE" = "SKIP" ]; then
  echo "OK: skipped (no STAGE_ID)"
elif [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; then
  echo "OK: $CODE (Sales cannot remark on non-PV or lead not visible)"
else
  echo "FAIL: expected 403 or 404, got $CODE"; exit 1
fi

echo ""
echo "--- 10b) PATCH stage remarks: Sales on property_visit stage -> 200 ---"
# Get a lead assigned to sales that has property_visit stage; Sales can add remark on that stage.
SALES_LEAD=$(curl -s "$BASE_URL/api/v1/leads/assigned?limit=10" -H "Authorization: Bearer $TOKEN_SALES" | jq -r '.data.leads[0].id // empty')
if [ -n "$SALES_LEAD" ]; then
  PV_STAGE_RESP=$(curl -s "$BASE_URL/api/v1/leads/$SALES_LEAD/stages/by-type/property_visit" -H "Authorization: Bearer $TOKEN_SALES")
  PV_STAGE_ID=$(echo "$PV_STAGE_RESP" | jq -r '.data.stage.id // empty')
  if [ -n "$PV_STAGE_ID" ] && [ "$PV_STAGE_ID" != "null" ]; then
    CODE=$(curl -s -o /tmp/remarks_sales.json -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$SALES_LEAD/stages/$PV_STAGE_ID/remarks" \
      -H "Authorization: Bearer $TOKEN_SALES" -H "Content-Type: application/json" \
      -d '{"remarks":"E2E Sales PV stage remark"}')
    if [ "$CODE" != "200" ]; then
      echo "FAIL: Sales PATCH remarks on PV stage expected 200, got $CODE"
      cat /tmp/remarks_sales.json | jq . 2>/dev/null || cat /tmp/remarks_sales.json
      exit 1
    fi
    echo "OK: 200, Sales added remark on PV stage: $(jq -r '.data.stage.remarks' /tmp/remarks_sales.json)"
  else
    echo "SKIP: No property_visit stage for sales lead (need lead in site_visit/property_visit)"
  fi
else
  echo "SKIP: No assigned lead for sales"
fi

echo ""
echo "--- 11) PATCH stage remarks fake stage_id -> 404 ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/leads/$LEAD_ID/stages/00000000-0000-0000-0000-000000000001/remarks" \
  -H "Authorization: Bearer $TOKEN_PS" -H "Content-Type: application/json" \
  -d '{"remarks":"No such stage"}')
[ "$CODE" = "404" ] && echo "OK: 404" || { echo "FAIL: expected 404, got $CODE"; exit 1; }

echo ""
echo "=== All E2E tests passed ==="
