#!/usr/bin/env bash
# E2E test for Lead Stats: GET /leads/stats and GET /leads/:id/stats (API only, no DB)
set -e
BASE_URL="${BASE_URL:-http://localhost:3001}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"

echo "=== Lead Stats E2E ==="
echo "Base URL: $BASE_URL"

# 1) Login as presales
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"madhu@bhoomiplots.com\",\"password\":\"$PASSWORD\"}")
TOKEN_PS=$(echo "$LOGIN_RESP" | jq -r '.data.token // empty')
[ -z "$TOKEN_PS" ] && { echo "FAIL: presales login (check API is up and credentials)"; echo "$LOGIN_RESP" | head -c 500; exit 1; }
echo "Presales token OK"

# 2) GET /leads/stats (aggregate) - verify API returns valid structure
echo ""
echo "--- GET /api/v1/leads/stats (aggregate) ---"
STATS=$(curl -s "$BASE_URL/api/v1/leads/stats" -H "Authorization: Bearer $TOKEN_PS")
echo "$STATS" | jq .
success=$(echo "$STATS" | jq -r '.success')
[ "$success" != "true" ] && { echo "FAIL: success not true"; exit 1; }
total_calls=$(echo "$STATS" | jq -r '.data.total_calls_made // 0')
message_sent=$(echo "$STATS" | jq -r '.data.message_sent // 0')
site_visit_done=$(echo "$STATS" | jq -r '.data.site_visit_done // 0')
calling_hour=$(echo "$STATS" | jq -r '.data.calling_hour // "0"')
calling_hour_seconds=$(echo "$STATS" | jq -r '.data.calling_hour_seconds // 0')
[ "$total_calls" -ge 0 ] || { echo "FAIL: total_calls_made invalid"; exit 1; }
[ "$message_sent" -ge 0 ] || { echo "FAIL: message_sent invalid"; exit 1; }
[ "$site_visit_done" -ge 0 ] || { echo "FAIL: site_visit_done invalid"; exit 1; }
echo "OK: total_calls_made=$total_calls, message_sent=$message_sent, site_visit_done=$site_visit_done, calling_hour=$calling_hour ($calling_hour_seconds sec)"

# 3) Get first lead and GET /leads/:id/stats
LEAD_ID=$(curl -s "$BASE_URL/api/v1/leads?limit=1" -H "Authorization: Bearer $TOKEN_PS" | jq -r '.data.leads[0].id // empty')
[ -z "$LEAD_ID" ] && { echo "FAIL: no lead for presales"; exit 1; }
echo ""
echo "--- GET /api/v1/leads/$LEAD_ID/stats (per lead) ---"
STATS_ONE=$(curl -s "$BASE_URL/api/v1/leads/$LEAD_ID/stats" -H "Authorization: Bearer $TOKEN_PS")
echo "$STATS_ONE" | jq .
success_one=$(echo "$STATS_ONE" | jq -r '.success')
[ "$success_one" != "true" ] && { echo "FAIL: per-lead success not true"; exit 1; }
total_calls_one=$(echo "$STATS_ONE" | jq -r '.data.total_calls_made')
message_sent_one=$(echo "$STATS_ONE" | jq -r '.data.message_sent')
site_visit_done_one=$(echo "$STATS_ONE" | jq -r '.data.site_visit_done')
calling_hour_one=$(echo "$STATS_ONE" | jq -r '.data.calling_hour')
calling_hour_seconds_one=$(echo "$STATS_ONE" | jq -r '.data.calling_hour_seconds')
[ "$total_calls_one" -ge 0 ] || { echo "FAIL: per-lead total_calls_made invalid"; exit 1; }
[ "$message_sent_one" -ge 0 ] || { echo "FAIL: per-lead message_sent invalid"; exit 1; }
[ "$site_visit_done_one" -ge 0 ] || { echo "FAIL: per-lead site_visit_done invalid"; exit 1; }
echo "OK: lead $LEAD_ID stats: total_calls=$total_calls_one, message_sent=$message_sent_one, site_visit_done=$site_visit_done_one, calling_hour=$calling_hour_one"

# 4) GET /leads/stats?period=30d
echo ""
echo "--- GET /api/v1/leads/stats?period=30d ---"
STATS_30=$(curl -s "$BASE_URL/api/v1/leads/stats?period=30d" -H "Authorization: Bearer $TOKEN_PS")
echo "$STATS_30" | jq .
[ "$(echo "$STATS_30" | jq -r '.success')" != "true" ] && { echo "FAIL: period=30d success not true"; exit 1; }
echo "OK: period=30d returns valid stats"

echo ""
echo "=== Lead Stats E2E passed ==="
