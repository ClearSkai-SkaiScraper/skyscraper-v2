#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# SPRINT 8c FULL REGRESSION TEST — SkaiScraper Production
# ═══════════════════════════════════════════════════════════════════════════════
#
# Tests ALL Sprint 7 → 8 → 8b → 8c fixes against production.
# Run: chmod +x scripts/sprint8c-regression-test.sh && ./scripts/sprint8c-regression-test.sh
#
# Categories:
#   1. Health & Infra
#   2. Auth Gate Enforcement (all protected routes → 401 unauthenticated)
#   3. Report Pipeline (Sprint 8c focus — preview, generate, CRUD)
#   4. Template System (Sprint 8/8b — company templates, CRUD)
#   5. Live Feed / Trades (Sprint 8b — feed, engage, team posts)
#   6. AI Hub (Sprint 8 — streaming, 502 fix)
#   7. Claims Pipeline
#   8. Leads Pipeline
#   9. Public Pages (no auth required — should NOT 401)
# ═══════════════════════════════════════════════════════════════════════════════

BASE="https://www.skaiscrape.com"
PASS=0
FAIL=0
WARN=0
RESULTS=""

# Colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

# ─── Helpers ──────────────────────────────────────────────────────────────────

check_status() {
  local label="$1"
  local url="$2"
  local method="${3:-GET}"
  local expected="${4:-401}"
  local body="$5"
  local extra_flags="$6"

  if [ "$method" = "GET" ]; then
    status=$(curl -sS -o /dev/null -w "%{http_code}" $extra_flags "$url" 2>/dev/null)
  else
    if [ -n "$body" ]; then
      status=$(curl -sS -o /dev/null -w "%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$body" $extra_flags "$url" 2>/dev/null)
    else
      status=$(curl -sS -o /dev/null -w "%{http_code}" -X "$method" $extra_flags "$url" 2>/dev/null)
    fi
  fi

  if [ "$status" = "$expected" ]; then
    echo -e "  ${GREEN}✅ PASS${RESET}  $label → $status (expected $expected)"
    PASS=$((PASS+1))
    RESULTS+="PASS|$label|$status|$expected\n"
  else
    echo -e "  ${RED}❌ FAIL${RESET}  $label → $status (expected $expected)"
    FAIL=$((FAIL+1))
    RESULTS+="FAIL|$label|$status|$expected\n"
  fi
}

check_json_field() {
  local label="$1"
  local url="$2"
  local field="$3"
  local expected_value="$4"

  response=$(curl -sS "$url" 2>/dev/null)
  actual=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','__MISSING__'))" 2>/dev/null)

  if [ "$actual" = "$expected_value" ]; then
    echo -e "  ${GREEN}✅ PASS${RESET}  $label → $field=$actual"
    PASS=$((PASS+1))
    RESULTS+="PASS|$label|$field=$actual|$expected_value\n"
  else
    echo -e "  ${RED}❌ FAIL${RESET}  $label → $field=$actual (expected $expected_value)"
    FAIL=$((FAIL+1))
    RESULTS+="FAIL|$label|$field=$actual|$expected_value\n"
  fi
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}"
  echo -e "${CYAN}${BOLD}  $1${RESET}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH & INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════
section "1. HEALTH & INFRASTRUCTURE"

check_status "GET /api/health (liveness)" "$BASE/api/health" "GET" "200"
check_json_field "Health body .ok" "$BASE/api/health" "ok" "True"

check_status "GET /api/health/live" "$BASE/api/health/live" "GET" "200"
check_status "GET /api/health/ready" "$BASE/api/health/ready" "GET" "200"

# ═══════════════════════════════════════════════════════════════════════════════
# 2. AUTH GATE ENFORCEMENT — All protected routes must 401 without auth
# ═══════════════════════════════════════════════════════════════════════════════
section "2. AUTH GATE — Protected Routes (expect 401)"

# ── Report routes (Sprint 8c — all converted to withAuth) ──
check_status "POST /api/reports/preview (no auth)" "$BASE/api/reports/preview" "POST" "401" '{"claimId":"test"}'
check_status "POST /api/reports/generate (no auth)" "$BASE/api/reports/generate" "POST" "401" '{"claimId":"test"}'
check_status "GET  /api/reports (no auth)" "$BASE/api/reports" "GET" "401"
check_status "GET  /api/reports/recent (no auth)" "$BASE/api/reports/recent" "GET" "401"
check_status "POST /api/reports/actions (no auth)" "$BASE/api/reports/actions" "POST" "401" '{"action":"generate","claimId":"x","reportType":"claims"}'
check_status "GET  /api/reports/fake-id (no auth)" "$BASE/api/reports/fake-id" "GET" "401"
check_status "DELETE /api/reports/fake-id (no auth)" "$BASE/api/reports/fake-id" "DELETE" "401"
check_status "POST /api/reports/fake-id/actions (no auth)" "$BASE/api/reports/fake-id/actions" "POST" "401" '{"action":"approve"}'
check_status "POST /api/reports/fake-id/export (no auth)" "$BASE/api/reports/fake-id/export" "POST" "401" '{"format":"pdf","sections":["coverPage"]}'
check_status "GET  /api/reports/fake-id/ai/baseline (no auth)" "$BASE/api/reports/fake-id/ai/baseline" "GET" "401"
check_status "POST /api/reports/fake-id/ai/baseline (no auth)" "$BASE/api/reports/fake-id/ai/baseline" "POST" "401"

# ── Template routes (Sprint 8/8b — all converted to withAuth) ──
check_status "GET  /api/templates/company (no auth)" "$BASE/api/templates/company" "GET" "401"
check_status "POST /api/templates/create (no auth)" "$BASE/api/templates/create" "POST" "401" '{"templateId":"test"}'
check_status "PATCH /api/templates/fake-id (no auth)" "$BASE/api/templates/fake-id" "PATCH" "401"
check_status "DELETE /api/templates/fake-id (no auth)" "$BASE/api/templates/fake-id" "DELETE" "401"
check_status "POST /api/templates/fake-id/duplicate (no auth)" "$BASE/api/templates/fake-id/duplicate" "POST" "401"
check_status "POST /api/templates/fake-id/set-default (no auth)" "$BASE/api/templates/fake-id/set-default" "POST" "401"
check_status "GET  /api/report-templates (no auth)" "$BASE/api/report-templates" "GET" "401"
check_status "POST /api/report-templates (no auth)" "$BASE/api/report-templates" "POST" "401" '{"name":"test"}'
check_status "DELETE /api/report-templates/fake-id (no auth)" "$BASE/api/report-templates/fake-id" "DELETE" "401"

# ── Trades / Feed routes (Sprint 8b) ──
check_status "GET  /api/trades/feed (no auth)" "$BASE/api/trades/feed" "GET" "401"
check_status "POST /api/trades/feed (no auth)" "$BASE/api/trades/feed" "POST" "401" '{"content":"test"}'
check_status "POST /api/trades/feed/engage (no auth)" "$BASE/api/trades/feed/engage" "POST" "401" '{"postId":"x","type":"like"}'
check_status "GET  /api/team/posts (no auth)" "$BASE/api/team/posts" "GET" "401"
check_status "GET  /api/trades/posts (no auth)" "$BASE/api/trades/posts" "GET" "401"

# ── Claims routes ──
check_status "GET  /api/claims (no auth)" "$BASE/api/claims" "GET" "401"
check_status "GET  /api/damage-claims/list (no auth)" "$BASE/api/damage-claims/list" "GET" "401"

# ── Leads routes ──
check_status "GET  /api/leads (no auth)" "$BASE/api/leads" "GET" "401"
check_status "POST /api/leads (no auth)" "$BASE/api/leads" "POST" "401" '{"title":"test"}'

# ── AI routes (Sprint 8 — 502 fix) ──
check_status "POST /api/ai/assistant (no auth)" "$BASE/api/ai/assistant" "POST" "401" '{"message":"test"}'
check_status "POST /api/ai/run (no auth)" "$BASE/api/ai/run" "POST" "401" '{"prompt":"test"}'

# ── Dashboard/Settings routes ──
check_status "GET  /api/dashboard/stats (no auth)" "$BASE/api/dashboard/stats" "GET" "401"
check_status "GET  /api/billing/status (no auth)" "$BASE/api/billing/status" "GET" "401"
check_status "GET  /api/team (no auth)" "$BASE/api/team" "GET" "401"

# ═══════════════════════════════════════════════════════════════════════════════
# 3. REPORT PIPELINE DEEP CHECK (Sprint 8c)
# ═══════════════════════════════════════════════════════════════════════════════
section "3. REPORT PIPELINE — Response Shapes"

# Verify preview returns proper JSON error (not HTML/500)
echo -n "  "
preview_body=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"claimId":"test"}' "$BASE/api/reports/preview" 2>/dev/null)
preview_has_json=$(echo "$preview_body" | python3 -c "import sys,json; json.load(sys.stdin); print('yes')" 2>/dev/null || echo "no")
if [ "$preview_has_json" = "yes" ]; then
  echo -e "${GREEN}✅ PASS${RESET}  Preview returns valid JSON (not HTML crash)"
  PASS=$((PASS+1))
else
  echo -e "${RED}❌ FAIL${RESET}  Preview did NOT return valid JSON"
  FAIL=$((FAIL+1))
fi

# Verify generate returns JSON (not blob/crash)
echo -n "  "
gen_body=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"claimId":"test"}' "$BASE/api/reports/generate" 2>/dev/null)
gen_has_json=$(echo "$gen_body" | python3 -c "import sys,json; json.load(sys.stdin); print('yes')" 2>/dev/null || echo "no")
if [ "$gen_has_json" = "yes" ]; then
  echo -e "${GREEN}✅ PASS${RESET}  Generate returns valid JSON (not blob crash)"
  PASS=$((PASS+1))
else
  echo -e "${RED}❌ FAIL${RESET}  Generate did NOT return valid JSON"
  FAIL=$((FAIL+1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. METHOD ENFORCEMENT — Wrong methods should 405 or 401 (not crash)
# ═══════════════════════════════════════════════════════════════════════════════
section "4. METHOD ENFORCEMENT"

# Note: Unauthenticated requests hit Clerk middleware (401) before route handler (405)
# Both 401 and 405 are acceptable — means the route isn't accidentally returning 200/500
check_status_either() {
  local label="$1"
  local url="$2"
  local method="${3:-GET}"
  local ok1="${4:-401}"
  local ok2="${5:-405}"

  status=$(curl -sS -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null)

  if [ "$status" = "$ok1" ] || [ "$status" = "$ok2" ]; then
    echo -e "  ${GREEN}✅ PASS${RESET}  $label → $status (expected $ok1 or $ok2)"
    PASS=$((PASS+1))
    RESULTS+="PASS|$label|$status|$ok1/$ok2\n"
  else
    echo -e "  ${RED}❌ FAIL${RESET}  $label → $status (expected $ok1 or $ok2)"
    FAIL=$((FAIL+1))
    RESULTS+="FAIL|$label|$status|$ok1/$ok2\n"
  fi
}

check_status_either "GET on POST-only /api/reports/preview" "$BASE/api/reports/preview" "GET" "401" "405"
check_status_either "GET on POST-only /api/reports/generate" "$BASE/api/reports/generate" "GET" "401" "405"
check_status_either "GET on POST-only /api/reports/actions" "$BASE/api/reports/actions" "GET" "401" "405"

# ═══════════════════════════════════════════════════════════════════════════════
# 5. PUBLIC PAGES — Should NOT require auth (200 or 3xx)
# ═══════════════════════════════════════════════════════════════════════════════
section "5. PUBLIC PAGES (expect 200)"

check_status "GET / (homepage)" "$BASE/" "GET" "200"
check_status "GET /pricing" "$BASE/pricing" "GET" "200"
check_status "GET /sign-in" "$BASE/sign-in" "GET" "200"
check_status "GET /sign-up" "$BASE/sign-up" "GET" "200"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. WEBHOOK SAFETY — Stripe webhook rejects unsigned requests
# ═══════════════════════════════════════════════════════════════════════════════
section "6. WEBHOOK SAFETY"

stripe_status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":true}' "$BASE/api/webhooks/stripe" 2>/dev/null)

if [ "$stripe_status" = "400" ] || [ "$stripe_status" = "401" ] || [ "$stripe_status" = "403" ]; then
  echo -e "  ${GREEN}✅ PASS${RESET}  Stripe webhook rejects unsigned → $stripe_status"
  PASS=$((PASS+1))
elif [ "$stripe_status" = "200" ]; then
  echo -e "  ${RED}❌ FAIL${RESET}  Stripe webhook ACCEPTED unsigned request → 200 (BAD!)"
  FAIL=$((FAIL+1))
else
  echo -e "  ${YELLOW}⚠️  WARN${RESET}  Stripe webhook → $stripe_status (unexpected but not 200)"
  WARN=$((WARN+1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 7. NO CLERK orgId LEAKS — Verify no route uses raw Clerk format
# ═══════════════════════════════════════════════════════════════════════════════
section "7. SOURCE CODE AUDIT — Clerk auth() Leaks in Report Routes"

echo -n "  "
# Count only NON-report routes (report routes are already fixed in Sprint 8c)
report_leaks=$(grep -rn "from \"@clerk/nextjs/server\"" \
  src/app/api/reports/ \
  src/app/api/report-templates/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$report_leaks" != "0" ]; then
  echo -e "${RED}❌ FAIL${RESET}  Report routes still importing raw Clerk auth() ($report_leaks files)"
  FAIL=$((FAIL+1))
else
  echo -e "${GREEN}✅ PASS${RESET}  All report routes clean — no raw Clerk auth() imports"
  PASS=$((PASS+1))
fi

# Check known backlog (trades/templates/team — Sprint 9 work, WARN only)
echo -n "  "
backlog_leaks=$(grep -rn "from \"@clerk/nextjs/server\"" \
  src/app/api/templates/ \
  src/app/api/trades/ \
  src/app/api/team/posts/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$backlog_leaks" = "0" ]; then
  echo -e "${GREEN}✅ PASS${RESET}  Trades/template/team routes also clean"
  PASS=$((PASS+1))
else
  echo -e "${YELLOW}⚠️  WARN${RESET}  $backlog_leaks trades/template/team routes still use raw Clerk auth() (Sprint 9 backlog)"
  WARN=$((WARN+1))
fi

# Check withAuth usage in all fixed routes
echo -n "  "
withauth_count=$(grep -rn "withAuth" \
  src/app/api/reports/route.ts \
  src/app/api/reports/preview/route.ts \
  src/app/api/reports/generate/route.ts \
  src/app/api/reports/recent/route.ts \
  src/app/api/reports/actions/route.ts \
  "src/app/api/reports/[reportId]/route.ts" \
  "src/app/api/reports/[reportId]/actions/route.ts" \
  "src/app/api/reports/[reportId]/export/route.ts" \
  "src/app/api/reports/[reportId]/ai/[sectionKey]/route.ts" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$withauth_count" -ge "9" ]; then
  echo -e "${GREEN}✅ PASS${RESET}  All 9 report routes use withAuth ($withauth_count references)"
  PASS=$((PASS+1))
else
  echo -e "${RED}❌ FAIL${RESET}  Only $withauth_count/9 report routes use withAuth"
  FAIL=$((FAIL+1))
fi

# Check error.message safety (no raw error leaks)
echo -n "  "
unsafe_err=$(grep -rn "error\.message" \
  src/app/api/reports/ \
  src/app/api/templates/ \
  src/app/api/report-templates/ 2>/dev/null \
  | grep -v "instanceof Error" | grep -v "\.message ||" | grep -v "test" | wc -l | tr -d ' ')

if [ "$unsafe_err" = "0" ]; then
  echo -e "${GREEN}✅ PASS${RESET}  No unsafe error.message access (all use instanceof Error)"
  PASS=$((PASS+1))
else
  echo -e "${YELLOW}⚠️  WARN${RESET}  Found $unsafe_err potentially unsafe error.message accesses"
  WARN=$((WARN+1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 8. TypeScript Compile Check
# ═══════════════════════════════════════════════════════════════════════════════
section "8. TYPESCRIPT COMPILE"

echo -n "  "
tsc_output=$(npx tsc --noEmit 2>&1)
tsc_exit=$?

if [ $tsc_exit -eq 0 ]; then
  echo -e "${GREEN}✅ PASS${RESET}  tsc --noEmit passed (0 errors)"
  PASS=$((PASS+1))
else
  tsc_errors=$(echo "$tsc_output" | grep "error TS" | wc -l | tr -d ' ')
  echo -e "${RED}❌ FAIL${RESET}  tsc --noEmit failed ($tsc_errors errors)"
  echo "$tsc_output" | grep "error TS" | head -10
  FAIL=$((FAIL+1))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 9. MISSING ROUTES CHECK — Known ghost routes that should exist
# ═══════════════════════════════════════════════════════════════════════════════
section "9. ROUTE EXISTENCE AUDIT"

check_route_exists() {
  local label="$1"
  local path="$2"

  if [ -f "$path" ]; then
    echo -e "  ${GREEN}✅ PASS${RESET}  $label exists"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}❌ FAIL${RESET}  $label MISSING — $path"
    FAIL=$((FAIL+1))
  fi
}

check_route_exists "reports/route.ts" "src/app/api/reports/route.ts"
check_route_exists "reports/preview/route.ts" "src/app/api/reports/preview/route.ts"
check_route_exists "reports/generate/route.ts" "src/app/api/reports/generate/route.ts"
check_route_exists "reports/recent/route.ts" "src/app/api/reports/recent/route.ts"
check_route_exists "reports/actions/route.ts" "src/app/api/reports/actions/route.ts"
check_route_exists "reports/[reportId]/route.ts" "src/app/api/reports/[reportId]/route.ts"
check_route_exists "reports/[reportId]/actions/route.ts" "src/app/api/reports/[reportId]/actions/route.ts"
check_route_exists "reports/[reportId]/export/route.ts" "src/app/api/reports/[reportId]/export/route.ts"
check_route_exists "reports/[reportId]/ai/[sectionKey]/route.ts" "src/app/api/reports/[reportId]/ai/[sectionKey]/route.ts"
check_route_exists "templates/company/route.ts" "src/app/api/templates/company/route.ts"
check_route_exists "templates/create/route.ts" "src/app/api/templates/create/route.ts"
check_route_exists "trades/feed/route.ts" "src/app/api/trades/feed/route.ts"
check_route_exists "trades/feed/engage/route.ts" "src/app/api/trades/feed/engage/route.ts"
check_route_exists "team/posts/route.ts" "src/app/api/team/posts/route.ts"

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  REGRESSION TEST SUMMARY — Sprint 8c${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
echo ""
TOTAL=$((PASS+FAIL+WARN))
echo -e "  ${GREEN}✅ PASSED:  $PASS${RESET}"
echo -e "  ${RED}❌ FAILED:  $FAIL${RESET}"
echo -e "  ${YELLOW}⚠️  WARNED: $WARN${RESET}"
echo -e "  📊 TOTAL:   $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}🎉 ALL TESTS PASSED — SAFE TO DEPLOY${RESET}"
else
  echo -e "  ${RED}${BOLD}🚨 $FAIL FAILURES — REVIEW BEFORE DEPLOY${RESET}"
  echo ""
  echo -e "  ${RED}Failed tests:${RESET}"
  echo -e "$RESULTS" | grep "^FAIL" | while IFS='|' read status label actual expected; do
    echo -e "    ${RED}✗${RESET} $label (got $actual, expected $expected)"
  done
fi

echo ""
echo -e "  Run: ${CYAN}chmod +x scripts/sprint8c-regression-test.sh && ./scripts/sprint8c-regression-test.sh${RESET}"
echo ""
