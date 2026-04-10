#!/bin/bash
#
# ╔══════════════════════════════════════════════════════════════╗
# ║            SKAISCRAPER PRO — DEMO DAY PROOF                 ║
# ║                                                              ║
# ║  Runs all proofs in sequence. Open this during the meeting.  ║
# ║  Usage:  ./demo-day.sh                                       ║
# ║          ./demo-day.sh --prod   (uses production URL)        ║
# ╚══════════════════════════════════════════════════════════════╝
#

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

banner() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

section_pass() {
  echo -e "  ${GREEN}✅ $1${NC}"
  PASS_COUNT=$((PASS_COUNT + 1))
}

section_fail() {
  echo -e "  ${RED}❌ $1${NC}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# ── Parse args ──────────────────────────────────────────────────
USE_PROD=false
if [[ "${1:-}" == "--prod" ]]; then
  USE_PROD=true
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         🛡️  SKAISCRAPER PRO — DEMO DAY PROOF           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Date:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo -e "  HEAD:    $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo -e "  Branch:  $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 1: Unit + Integration Tests
# ═══════════════════════════════════════════════════════════════
banner "PHASE 1 — Unit & Integration Tests (Vitest)"

VITEST_OUTPUT=$(npx vitest run --reporter=dot 2>&1)
VITEST_EXIT=$?
echo "$VITEST_OUTPUT" | tail -5

if [[ $VITEST_EXIT -eq 0 ]]; then
  VITEST_RESULT=$(echo "$VITEST_OUTPUT" | grep "Tests" | tail -1)
  section_pass "Vitest: $VITEST_RESULT"
else
  section_fail "Vitest: some tests failed (exit code $VITEST_EXIT)"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 2: AI Zod Coverage Guard
# ═══════════════════════════════════════════════════════════════
banner "PHASE 2 — AI Zod Validation Coverage"

ZOD_RESULT=$(npx vitest run __tests__/ai-zod-coverage.test.ts 2>&1 | grep "Tests" | tail -1)
if echo "$ZOD_RESULT" | grep -q "passed"; then
  section_pass "AI Zod: $ZOD_RESULT"
else
  section_fail "AI Zod: $ZOD_RESULT"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 3: Cross-Tenant Isolation (Production)
# ═══════════════════════════════════════════════════════════════
banner "PHASE 3 — Cross-Tenant Isolation Proof"

if $USE_PROD; then
  export BASE_URL="https://www.skaiscrape.com"
else
  export BASE_URL="${BASE_URL:-https://www.skaiscrape.com}"
fi

echo -e "  Target: ${YELLOW}$BASE_URL${NC}"
echo ""

if bash ./scripts/cross-tenant-demo.sh 2>&1; then
  section_pass "Cross-tenant isolation: all checks passed"
else
  section_fail "Cross-tenant isolation: some checks failed"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 4: Production Health Check
# ═══════════════════════════════════════════════════════════════
banner "PHASE 4 — Production Health"

HEALTH_URL="${BASE_URL}/api/health/live"
echo -e "  Target: ${YELLOW}$HEALTH_URL${NC}"
echo ""

HEALTH=$(curl -sS "$HEALTH_URL" 2>/dev/null)
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
SHA=$(echo "$HEALTH" | grep -o '"commitSha":"[^"]*"' | head -1 | cut -d'"' -f4)
BUILD=$(echo "$HEALTH" | grep -o '"buildTime":"[^"]*"' | head -1 | cut -d'"' -f4)
DEPLOY=$(echo "$HEALTH" | grep -o '"deploymentId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ "$STATUS" == "ok" || "$STATUS" == "degraded" ]]; then
  section_pass "Health: $STATUS"
  echo -e "         commitSha:    ${CYAN}$SHA${NC}"
  echo -e "         buildTime:    ${CYAN}$BUILD${NC}"
  echo -e "         deploymentId: ${CYAN}$DEPLOY${NC}"
else
  section_fail "Health: $STATUS (expected ok)"
fi

# ═══════════════════════════════════════════════════════════════
# FINAL RESULTS
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"

TOTAL=$((PASS_COUNT + FAIL_COUNT))

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}██████╗  █████╗ ███████╗███████╗${NC}"
  echo -e "  ${GREEN}${BOLD}██╔══██╗██╔══██╗██╔════╝██╔════╝${NC}"
  echo -e "  ${GREEN}${BOLD}██████╔╝███████║███████╗███████╗${NC}"
  echo -e "  ${GREEN}${BOLD}██╔═══╝ ██╔══██║╚════██║╚════██║${NC}"
  echo -e "  ${GREEN}${BOLD}██║     ██║  ██║███████║███████║${NC}"
  echo -e "  ${GREEN}${BOLD}╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝${NC}"
  echo ""
  echo -e "  ${GREEN}${BOLD}ALL $TOTAL PROOF PHASES PASSED${NC}"
  echo -e "  ${GREEN}SkaiScraper Pro is enterprise-ready.${NC}"
else
  echo ""
  echo -e "  ${RED}${BOLD}⚠️  $FAIL_COUNT of $TOTAL phases failed${NC}"
  echo -e "  ${RED}Review output above for details.${NC}"
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""

exit $FAIL_COUNT
