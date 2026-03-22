# 🗺️ UNIFIED SYSTEM MAP — Domain Consolidation Plan

> **Generated:** 2026-03-22  
> **Purpose:** Define ONE canonical flow per domain. Eliminate duplicates.  
> **Phase:** 2 (UNIFY) — POST-DAU execution, but mapped now for clarity

---

## LEGEND

- 🟢 **CANONICAL** — the ONE true path
- 🔴 **MERGE** — fold into canonical
- ⚪ **REMOVE** — delete or redirect
- 🟡 **KEEP** — separate purpose, keep as-is

---

## 1. CLAIMS DOMAIN

### Canonical Flow

```
/claims → /claims/[claimId]/overview → upload photos → run AI → /claims/[claimId]/intel → generate report
```

| Route                                | Verdict      | Action                                |
| ------------------------------------ | ------------ | ------------------------------------- |
| `/claims`                            | 🟢 CANONICAL | Hub — list + create                   |
| `/claims/[claimId]/*` (26 sub-pages) | 🟢 CANONICAL | Claim detail tabs                     |
| `/claims/wizard`                     | 🔴 MERGE     | → `/claims` create flow               |
| `/claims/tracker`                    | 🔴 MERGE     | → `/claims` with filter view          |
| `/claims/approvals`                  | 🟡 KEEP      | Separate approval workflow            |
| `/claims/appeal`                     | ⚪ REMOVE    | Duplicate of `/claims/appeal-builder` |
| `/claims/appeal-builder`             | 🟢 CANONICAL | Keep as claim tool                    |
| `/claims/ready`                      | ⚪ REMOVE    | Duplicate of `/claims-ready-folder`   |
| `/claims/ai-vision`                  | 🔴 MERGE     | → `/claims/[claimId]/intel`           |
| `/claims-ready-folder`               | 🟢 CANONICAL | Claim packet builder                  |
| `/claimiq`                           | 🔴 MERGE     | → `/claims/[claimId]/intel`           |

---

## 2. REPORTS DOMAIN

### Canonical Flow

```
/reports → select claim → choose template → generate → export/download
```

| Route                        | Verdict      | Action                           |
| ---------------------------- | ------------ | -------------------------------- |
| `/reports`                   | 🟢 CANONICAL | Hub — list, create, export       |
| `/reports/claims/[claimId]`  | 🟢 CANONICAL | Claim-specific report            |
| `/reports/claims/new`        | 🟢 CANONICAL | New claim report builder         |
| `/reports/templates/*`       | 🟢 CANONICAL | Template management              |
| `/report-workbench`          | 🔴 MERGE     | → `/reports` (add workbench tab) |
| `/reports/hub`               | ⚪ REMOVE    | Exact duplicate of `/reports`    |
| `/reports/builder`           | 🔴 MERGE     | → `/reports/claims/new`          |
| `/reports/new/smart`         | 🔴 MERGE     | → `/reports/claims/new`          |
| `/reports/advanced`          | 🔴 MERGE     | → `/reports` (add advanced tab)  |
| `/reports/config`            | 🔴 MERGE     | → `/reports/templates` settings  |
| `/reports/contractor-packet` | 🟡 KEEP      | Specialized export               |
| `/reports/weather`           | 🔴 MERGE     | → `/weather` hub                 |
| `/reports/quick/history`     | 🔴 MERGE     | → `/reports` history filter      |
| `/ai/report-assembly`        | 🔴 MERGE     | → `/reports/claims/new`          |
| `/exports/reports/*`         | 🟡 KEEP      | Export views (print-optimized)   |

---

## 3. WEATHER / STORM DOMAIN

### Canonical Flow

```
/weather-chains → select area → view events → /claims/[claimId]/weather → generate report
```

| Route                           | Verdict      | Action                                      |
| ------------------------------- | ------------ | ------------------------------------------- |
| `/weather-chains`               | 🟢 CANONICAL | Main weather hub (already nav'd)            |
| `/weather/analytics`            | 🟢 CANONICAL | Weather analytics sub-page                  |
| `/claims/[claimId]/weather`     | 🟢 CANONICAL | Per-claim weather                           |
| `/storm-center`                 | 🔴 MERGE     | → `/weather-chains`                         |
| `/storm-graph/prequal`          | 🔴 MERGE     | → `/weather-chains` sub-view                |
| `/maps/weather`                 | 🔴 MERGE     | → `/weather-chains` map view                |
| `/maps/weather-chains`          | ⚪ REMOVE    | Exact duplicate                             |
| `/maps-weather/weather-reports` | ⚪ REMOVE    | Orphan route group                          |
| `/weather` (no page.tsx)        | 🟢 CREATE    | → Hub page redirecting to `/weather-chains` |

**PRE-DAU ACTION:** Create `/weather/page.tsx` (DUP-09) as redirect to `/weather-chains`.

---

## 4. CONNECTIONS / NETWORK DOMAIN

### Canonical Flow

```
/company/connections → browse → invite → connect → collaborate
```

| Route                  | Verdict      | Action                                |
| ---------------------- | ------------ | ------------------------------------- |
| `/company/connections` | 🟢 CANONICAL | Hub — connection management           |
| `/trades/*`            | 🟢 CANONICAL | Trades network (separate purpose)     |
| `/connections`         | ⚪ REMOVE    | Duplicate of `/company/connections`   |
| `/network/*` (6 pages) | 🔴 MERGE     | → `/trades` or `/company/connections` |
| `/vendor-network`      | 🔴 MERGE     | → `/trades`                           |

---

## 5. MESSAGING DOMAIN

### Canonical Flow

```
/messages → threads → compose → send (pro↔client, pro↔pro)
```

| Route                  | Verdict      | Action                           |
| ---------------------- | ------------ | -------------------------------- |
| `/messages`            | 🟢 CANONICAL | Unified messaging hub            |
| `/messages/[threadId]` | 🟢 CANONICAL | Thread view                      |
| `/inbox`               | ⚪ REMOVE    | → redirect to `/messages`        |
| `/sms`                 | 🔴 MERGE     | → `/messages` with SMS tab       |
| `/trades/messages`     | 🔴 MERGE     | → `/messages` with trades filter |

---

## 6. ANALYTICS DOMAIN

### Canonical Flow

```
/analytics/dashboard → drill into domains → export
```

| Route                        | Verdict      | Action                   |
| ---------------------------- | ------------ | ------------------------ |
| `/analytics/dashboard`       | 🟢 CANONICAL | Main analytics           |
| `/analytics/claims-timeline` | 🟢 CANONICAL | Claims analytics         |
| `/analytics/performance`     | 🟢 CANONICAL | Performance analytics    |
| `/analytics/reports`         | 🟢 CANONICAL | Report analytics         |
| `/performance`               | ⚪ REMOVE    | Duplicate                |
| `/dashboard/kpis`            | 🔴 MERGE     | → `/analytics/dashboard` |

---

## 7. FINANCIAL DOMAIN

### Canonical Flow

```
/finance/overview → invoices → commissions → billing (settings)
```

| Route                | Verdict      | Action                          |
| -------------------- | ------------ | ------------------------------- |
| `/finance/overview`  | 🟢 CANONICAL | Finance hub                     |
| `/invoices`          | 🟢 CANONICAL | Invoice management (add to nav) |
| `/commissions`       | 🟢 CANONICAL | Commission tracking             |
| `/settings/billing`  | 🟢 CANONICAL | Billing settings                |
| `/billing`           | ⚪ REMOVE    | → redirect `/settings/billing`  |
| `/account/billing`   | ⚪ REMOVE    | → redirect `/settings/billing`  |
| `/financial/reports` | ⚪ REMOVE    | → redirect `/finance/overview`  |

---

## 8. TEAM DOMAIN

### Canonical Flow

```
/teams → members → invite → hierarchy → activity
```

| Route              | Verdict      | Action                                         |
| ------------------ | ------------ | ---------------------------------------------- |
| `/teams`           | 🟢 CANONICAL | Team hub (already nav'd)                       |
| `/teams/hierarchy` | 🟢 CANONICAL | Org chart                                      |
| `/teams/invite`    | 🟢 CANONICAL | Invite flow                                    |
| `/team`            | ⚪ REMOVE    | → redirect `/teams`                            |
| `/team/activity`   | 🔴 MERGE     | → `/teams` activity tab                        |
| `/settings/team`   | 🟡 KEEP      | Team settings (different from team management) |

---

## 9. ESTIMATES / SCOPES DOMAIN

### Canonical Flow

```
/estimates → new estimate → scope editor → finalize
```

| Route             | Verdict      | Action                     |
| ----------------- | ------------ | -------------------------- |
| `/estimates`      | 🟢 CANONICAL | Estimates hub (add to nav) |
| `/estimates/new`  | 🟢 CANONICAL | New estimate               |
| `/scope-editor`   | 🔴 MERGE     | → `/estimates` scope tab   |
| `/scopes/new`     | ⚪ REMOVE    | Duplicate                  |
| `/quotes/builder` | ⚪ REMOVE    | Duplicate of estimates     |

---

## 10. MAPS DOMAIN

### Canonical Flow

```
/maps → door-knocking | map-view | routes | weather
```

| Route                    | Verdict      | Action                              |
| ------------------------ | ------------ | ----------------------------------- |
| `/maps` (needs page.tsx) | 🟢 CREATE    | Hub linking to sub-pages            |
| `/maps/door-knocking`    | 🟢 CANONICAL | Door-knocking map                   |
| `/maps/map-view`         | 🟢 CANONICAL | General map view                    |
| `/maps/routes`           | 🟢 CANONICAL | Route planning                      |
| `/company-map`           | 🔴 MERGE     | → `/maps/map-view`                  |
| `/jobs/map`              | 🔴 MERGE     | → `/maps/map-view` with jobs filter |

---

## CONSOLIDATION SUMMARY

| Action                         | Count |
| ------------------------------ | ----- |
| 🟢 CANONICAL (keep as-is)      | 48    |
| 🔴 MERGE (fold into canonical) | 28    |
| ⚪ REMOVE (delete or redirect) | 19    |
| 🟡 KEEP (separate purpose)     | 7     |
| 🟢 CREATE (missing pages)      | 2     |

### Phase 2 Execution Order

1. **Wave 1:** Remove exact duplicates (redirect → canonical) — 19 items
2. **Wave 2:** Merge overlapping features — 28 items
3. **Wave 3:** Create missing hub pages — 2 items
4. **Wave 4:** Update nav to reflect unified structure

> **PRE-DAU:** Only fix ghost nav links + create missing hub pages (3 items).  
> **POST-DAU:** Full consolidation per wave schedule.
