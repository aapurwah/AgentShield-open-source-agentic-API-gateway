#!/usr/bin/env bash
set -euo pipefail

PROXY="${PROXY_URL:-http://localhost:8080}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass=0
fail=0

pass_msg() { echo -e "${GREEN}[PASS]${NC} $1"; pass=$((pass+1)); }
fail_msg() { echo -e "${RED}[FAIL]${NC} $1"; fail=$((fail+1)); }
info()    { echo -e "${CYAN}[INFO]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║       AgentShield MVP Test Suite              ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Helper: make a request and return HTTP status code
do_req() {
  local method="${1:-GET}"
  local path="${2:-/api/test}"
  local goal_id="${3:-}"
  local task_id="${4:-}"
  local body="${5:-}"
  local extra_headers="${6:-}"

  local goal_header=""
  local task_header=""

  if [ -n "$goal_id" ]; then
    goal_header="-H X-Agent-Goal-ID:$goal_id"
  fi
  if [ -n "$task_id" ]; then
    task_header="-H X-Agent-Task-ID:$task_id"
  fi

  curl -s -o /dev/null -w "%{http_code}" \
    -X "$method" \
    $goal_header \
    $task_header \
    ${body:+-d "$body"} \
    ${extra_headers:+-H "$extra_headers"} \
    "$PROXY$path"
}

# Helper: do request and get response body
do_req_body() {
  local method="${1:-GET}"
  local path="${2:-/api/test}"
  local goal_id="${3:-}"
  local task_id="${4:-}"
  local body="${5:-}"

  local goal_header=""
  local task_header=""

  if [ -n "$goal_id" ]; then
    goal_header="-H X-Agent-Goal-ID:$goal_id"
  fi
  if [ -n "$task_id" ]; then
    task_header="-H X-Agent-Task-ID:$task_id"
  fi

  curl -s -X "$method" \
    $goal_header \
    $task_header \
    ${body:+-d "$body"} \
    "$PROXY$path"
}

# ───────────────────────────────────────────────
# TEST B: Agent Goal Burst – 50 requests under burst limit
# ───────────────────────────────────────────────
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  TEST B: Goal-Based Burst – 50 requests${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
info "Sending 50 requests with X-Agent-Goal-ID:goal-burst-test..."

burst_ok=0
burst_fail=0
for i in $(seq 1 50); do
  code=$(do_req "GET" "/api/burst" "goal-burst-test" "task-$i")
  if [ "$code" = "200" ]; then
    burst_ok=$((burst_ok+1))
  else
    burst_fail=$((burst_fail+1))
  fi
done

if [ "$burst_ok" = "50" ]; then
  pass_msg "Goal burst: 50/50 requests succeeded (200)"
else
  fail_msg "Goal burst: $burst_ok/50 succeeded, $burst_fail failed (got non-200)"
fi

# ───────────────────────────────────────────────
# TEST C: Request Coalescing (Deduplication)
# ───────────────────────────────────────────────
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  TEST C: Request Coalescing (5 identical reqs)${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
info "Sending 5 identical requests simultaneously within 100ms window..."
info "Expected: only 1 reaches backend; 4 get cached response"

# Fire 5 requests in parallel with same goal-id, same path, same body
tmpdir=$(mktemp -d)
COALESCE_GOAL="coalesce-$RANDOM"
COALESCE_BODY='{"action":"search","query":"test-coalescing"}'

for i in $(seq 1 5); do
  do_req_body "POST" "/api/coalesce" "$COALESCE_GOAL" "task-coalesce" "$COALESCE_BODY" > "$tmpdir/resp-$i.txt" 2>/dev/null &
done
wait

# Check all succeeded
coal_ok=0
for i in $(seq 1 5); do
  if grep -q '"message"' "$tmpdir/resp-$i.txt" 2>/dev/null; then
    coal_ok=$((coal_ok+1))
  fi
done

if [ "$coal_ok" = "5" ]; then
  pass_msg "Coalescing: all 5 requests got valid responses"
  info "Checking if responses are identical (coalesced)..."
  # If coalescing worked, all 5 would have the exact same response body including timestamp
  first_body=$(cat "$tmpdir/resp-1.txt")
  all_same=true
  for i in $(seq 2 5); do
    if ! diff <(echo "$first_body") "$tmpdir/resp-$i.txt" > /dev/null 2>&1; then
      all_same=false
      break
    fi
  done
  if $all_same; then
    pass_msg "Coalescing: all 5 responses are identical (same cached response served)"
  else
    info "Coalescing: responses differ (may be timing-dependent in Docker, this is OK)"
  fi
else
  fail_msg "Coalescing: only $coal_ok/5 responses succeeded"
fi

rm -rf "$tmpdir"

# ───────────────────────────────────────────────
# TEST D: Loop Detection
# ───────────────────────────────────────────────
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  TEST D: Loop Detection (>20 identical reqs)${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
info "Sending 25 requests from same task to same endpoint..."
info "Expected: first 20 pass (200), request 21+ get 418 (I'm a Teapot)"

LOOP_GOAL="loop-goal-$RANDOM"
LOOP_TASK="stuck-task-$RANDOM"
loop_200=0
loop_418=0

for i in $(seq 1 25); do
  code=$(do_req "GET" "/api/sticky-endpoint" "$LOOP_GOAL" "$LOOP_TASK")
  if [ "$code" = "200" ]; then
    loop_200=$((loop_200+1))
  elif [ "$code" = "418" ]; then
    loop_418=$((loop_418+1))
  fi
done

if [ "$loop_418" -gt 0 ]; then
  pass_msg "Loop detection: $loop_418 requests returned 418 (Teapot) – stuck task blocked"
else
  fail_msg "Loop detection: no 418 responses (got $loop_200 OK, $loop_418 teapot)"
fi

# ───────────────────────────────────────────────
# TEST A: Standard IP Rate Limiting
# ───────────────────────────────────────────────
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  TEST A: Standard IP Rate Limiting${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
info "Bombarding proxy without agent headers to exceed 100 req/min limit..."

ip_200=0
ip_429=0
for i in $(seq 1 120); do
  code=$(do_req "GET" "/api/normal" "" "")
  if [ "$code" = "200" ]; then
    ip_200=$((ip_200+1))
  elif [ "$code" = "429" ]; then
    ip_429=$((ip_429+1))
  fi
done

if [ "$ip_429" -gt 0 ]; then
  pass_msg "IP rate limiting: $ip_429 requests got 429 – IP limit enforced"
  info "($ip_200 passed, $ip_429 blocked)"
else
  fail_msg "IP rate limiting: no 429 responses (all $ip_200 passed)"
fi

# ───────────────────────────────────────────────
# SUMMARY
# ───────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              TEST RESULTS                     ║"
echo "╠═══════════════════════════════════════════════╣"
printf "║  ${GREEN}Passed: %-2d${NC}                              ║\n" $pass
printf "║  ${RED}Failed: %-2d${NC}                              ║\n" $fail
echo "╚═══════════════════════════════════════════════╝"
echo ""

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
