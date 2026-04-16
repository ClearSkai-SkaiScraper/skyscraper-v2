# Smoke Test Runbook

> Run before every demo or production deploy. ~5 minutes.

## Pre-flight

```bash
# 1. Verify build passes
pnpm build

# 2. Verify zero TypeScript errors
pnpm typecheck

# 3. Verify health endpoint
curl -s https://skaiscrape.com/api/health/live && echo " ✅"
```

## Critical Path Tests

### 1. Authentication

- [ ] Sign in with Clerk → redirects to dashboard
- [ ] Sign out → redirects to marketing page
- [ ] Unauthenticated user hitting `/dashboard` → redirected to sign-in

### 2. Dashboard

- [ ] Dashboard loads without errors
- [ ] Goal progress bars render (3-column layout)
- [ ] Goals save when edited (no 403 error)
- [ ] Stats cards show real data

### 3. Claims

- [ ] Create new claim → appears in list
- [ ] Open claim detail → all tabs load
- [ ] Claim pipeline stages render

### 4. Weather Intelligence

- [ ] Weather map loads with real data
- [ ] Quick Actions bar visible at top
- [ ] DOL pull generates map imagery

### 5. Team Management

- [ ] Send team invitation (Clerk email arrives)
- [ ] Team list shows current members
- [ ] Role badges display correctly

### 6. Reviews

- [ ] Submit review for a contractor → success response
- [ ] View contractor reviews → pagination works
- [ ] Rating distribution renders
- [ ] Cannot review yourself (400 error)
- [ ] Cannot submit duplicate review (409 error)

### 7. Depreciation

- [ ] Check depreciation status for a claim
- [ ] Generate depreciation package
- [ ] Send depreciation package

### 8. Profile

- [ ] Profile strength shows correct percentage
- [ ] Editing profile fields updates strength in real-time
- [ ] Client profile reaches 100% when all fields filled

### 9. Navigation

- [ ] Sidebar renders all sections
- [ ] "My Profile & Company" appears under Trades Network Hub
- [ ] Mobile nav works on narrow viewport

### 10. Security Spot Checks

- [ ] API call without auth → 401 (test: `curl -X POST https://skaiscrape.com/api/ask-dominus`)
- [ ] Cross-org claim access → 403 or empty result
- [ ] Rate-limited endpoint returns 429 after burst

## Post-deploy

- [ ] Sentry: no new errors in last 5 minutes
- [ ] Vercel: deployment status green
- [ ] Health endpoint still returns 200
