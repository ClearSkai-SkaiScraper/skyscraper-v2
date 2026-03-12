#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# typecheck-guard.sh  — Run BEFORE every build / push / deploy
# Catches TypeScript errors that SWC silently passes through,
# preventing broken builds from ever reaching Vercel.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍  TypeScript Pre-Build Guard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Run tsc --noEmit against the typecheck config
echo "→ Running tsc --noEmit ..."

TSC_OUTPUT=$(npx tsc --noEmit --project tsconfig.typecheck.json 2>&1 || true)
ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)

if [ "$ERROR_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${RED}✘ BLOCKED: ${ERROR_COUNT} TypeScript error(s) found${NC}"
  echo ""
  echo "$TSC_OUTPUT"
  echo ""
  echo -e "${YELLOW}Fix these errors before building or pushing.${NC}"
  echo "Run:  pnpm typecheck"
  exit 1
fi

echo -e "${GREEN}✔ TypeScript check passed — 0 errors${NC}"
echo ""
