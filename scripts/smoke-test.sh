#!/bin/bash
# Production Smoke Test — SkaiScraper
export PATH="/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
BASE="https://skaiscrape.com"

echo "==========================================="
echo "  SKAISCAPER PRODUCTION SMOKE TEST"
echo "  $(date)"
echo "==========================================="

echo ""
echo "--- 1. HEALTH CHECK ---"
HEALTH=$(curl -sSL "$BASE/api/health" 2>&1)
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

echo ""
echo "--- 2. PUBLIC PAGES (expect 200) ---"
for p in "/" "/sign-up" "/client/sign-up" "/pricing" "/sign-in" "/client/sign-in"; do
  CODE=$(curl -sSL -o /dev/null -w "%{http_code}" "$BASE$p" 2>&1)
  if [ "$CODE" = "200" ]; then echo "  ✅ $p → $CODE"; else echo "  ❌ $p → $CODE"; fi
done

echo ""
echo "--- 3. PROTECTED APIs (expect 401 unauthorized) ---"
for p in "/api/claims" "/api/billing/plans" "/api/company/connections" "/api/weather/storm-events" "/api/teams" "/api/contacts/search" "/api/claims/field-intake"; do
  CODE=$(curl -sSL -o /dev/null -w "%{http_code}" "$BASE$p" 2>&1)
  if [ "$CODE" = "401" ]; then echo "  ✅ $p → $CODE (correctly blocked)"; else echo "  ⚠️  $p → $CODE"; fi
done

echo ""
echo "--- 4. STRIPE WEBHOOK (expect 400 = no signature) ---"
CODE=$(curl -sS -X POST -H "Content-Type: application/json" -d '{"test":true}' -o /dev/null -w "%{http_code}" "$BASE/api/webhooks/stripe" 2>&1)
if [ "$CODE" = "400" ]; then echo "  ✅ /api/webhooks/stripe POST → $CODE (correctly rejects no sig)"; else echo "  ⚠️  /api/webhooks/stripe POST → $CODE"; fi

echo ""
echo "--- 5. PRO PAGES unauthed (expect 307 redirect to sign-in) ---"
for p in "/dashboard" "/claims" "/field" "/storm-leads" "/analytics" "/settings/billing" "/teams" "/contacts" "/contracts" "/work-orders" "/leaderboard" "/clients" "/network" "/company"; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE$p" 2>&1)
  if [ "$CODE" = "307" ]; then echo "  ✅ $p → $CODE (redirected)"; else echo "  ⚠️  $p → $CODE"; fi
done

echo ""
echo "--- 6. CLIENT PORTAL unauthed (expect 307 redirect) ---"
for p in "/portal" "/portal/claims"; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE$p" 2>&1)
  if [ "$CODE" = "307" ]; then echo "  ✅ $p → $CODE (redirected)"; else echo "  ⚠️  $p → $CODE"; fi
done

echo ""
echo "--- 7. FAILURE PATHS ---"
echo "  Testing invalid claim ID..."
CODE=$(curl -sSL -o /dev/null -w "%{http_code}" "$BASE/api/claims/FAKEID123/photos" 2>&1)
echo "  /api/claims/FAKEID123/photos → $CODE"

echo "  Testing invalid share token..."
CODE=$(curl -sSL -o /dev/null -w "%{http_code}" "$BASE/share/claim/invalidtoken999" 2>&1)
echo "  /share/claim/invalidtoken999 → $CODE"

echo "  Testing POST with no body..."
CODE=$(curl -sS -X POST -o /dev/null -w "%{http_code}" "$BASE/api/claims/field-intake" 2>&1)
echo "  POST /api/claims/field-intake (no body) → $CODE"

echo ""
echo "==========================================="
echo "  SMOKE TEST COMPLETE"
echo "==========================================="
