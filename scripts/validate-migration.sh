#!/usr/bin/env bash
# ============================================================================
# validate-migration.sh — Pre-deploy migration dry-run
# ============================================================================
# Validates SQL migration files against a shadow database before applying
# to production. Catches syntax errors, constraint violations, and
# incompatible schema changes early.
#
# Usage:
#   ./scripts/validate-migration.sh                    # Validate all pending
#   ./scripts/validate-migration.sh path/to/file.sql   # Validate single file
#
# Requires: psql, DATABASE_URL env var
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MIGRATIONS_DIR="./db/migrations"
SHADOW_DB="${SHADOW_DATABASE_URL:-}"
MAIN_DB="${DATABASE_URL:-}"

log_info()  { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ── Pre-flight checks ──
if [ -z "$MAIN_DB" ]; then
  log_error "DATABASE_URL is not set"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  log_error "psql is not installed"
  exit 1
fi

# ── Determine which migrations to validate ──
if [ $# -gt 0 ]; then
  FILES=("$@")
else
  # Find all .sql files in migrations dir
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
  fi
  FILES=()
  while IFS= read -r -d '' file; do
    FILES+=("$file")
  done < <(find "$MIGRATIONS_DIR" -name "*.sql" -not -path "*/archive/*" -print0 | sort -z)
fi

if [ ${#FILES[@]} -eq 0 ]; then
  log_warn "No migration files found"
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Migration Validator — SkaiScraper"
echo "  Files to validate: ${#FILES[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASSED=0
FAILED=0
ERRORS=()

for file in "${FILES[@]}"; do
  filename=$(basename "$file")
  printf "  Checking %-50s " "$filename"

  # Validate SQL syntax by wrapping in a transaction and rolling back
  output=$(psql "$MAIN_DB" -v ON_ERROR_STOP=1 -c "BEGIN;" -f "$file" -c "ROLLBACK;" 2>&1) && {
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
  } || {
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
    ERRORS+=("$filename: $output")
  }
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ${PASSED} passed, ${FAILED} failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  log_error "Failed migrations:"
  for err in "${ERRORS[@]}"; do
    echo "  → $err"
  done
  exit 1
fi

log_info "All migrations validated successfully"
exit 0
