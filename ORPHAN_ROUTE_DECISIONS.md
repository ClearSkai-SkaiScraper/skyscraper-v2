# Orphan Route Decisions — Sprint 14

> **Generated:** Sprint 14 during Phase 2 execution
> **Context:** 297 page.tsx files under `(app)/`, 55 in navConfig → ~242 orphan routes

---

## Summary

| Category                        | Count | Action                                           |
| ------------------------------- | ----- | ------------------------------------------------ |
| **In navConfig**                | 55    | ✅ No action needed                              |
| **Deep-link only**              | ~148  | ✅ Valid — reachable from parent pages           |
| **Gated flows**                 | 11    | ✅ Valid — onboarding, trial, trades setup       |
| **Internal/dev**                | ~18   | ✅ Valid — admin/ops tools, should be role-gated |
| **DAU-critical (added to nav)** | 10    | ✅ Added in this sprint                          |
| **Dead/redundant**              | ~22   | ⚠️ Documented — future cleanup sprint            |

---

## DAU-Critical Routes Added to NavConfig

| Route                  | Nav Label       | Section              |
| ---------------------- | --------------- | -------------------- |
| `/settings/billing`    | Billing & Plans | Finance & Messages   |
| `/contacts`            | Contacts        | Network              |
| `/clients`             | Clients         | Network              |
| `/weather-report`      | Weather Hub     | Storm Command Center |
| `/estimates`           | Estimates       | Finance & Messages   |
| `/contracts`           | Contracts       | Documents            |
| `/work-orders`         | Work Orders     | Jobs & Field Ops     |
| `/support`             | Help & Support  | Company              |
| `/search`              | Search          | Storm Command Center |
| `/maps/weather-chains` | Weather Map     | Storm Command Center |

---

## Dead/Redundant Routes (Future Cleanup)

These routes are likely duplicates or legacy experiments. They should be:

1. Verified they have 0 inbound links
2. Redirected to canonical paths OR deleted

| Route                            | Issue                                     | Canonical Path |
| -------------------------------- | ----------------------------------------- | -------------- |
| `/billing`                       | Duplicate of `/settings/billing`          | → redirect     |
| `/weather`                       | Duplicate of `/weather-report`            | → redirect     |
| `/rebuttal`                      | Standalone duplicate of claims tool       | → remove       |
| `/depreciation`                  | Standalone duplicate of claims tool       | → remove       |
| `/inbox`                         | Duplicate of `/messages`                  | → redirect     |
| `/claim-documents`               | Duplicate of `/documents/carrier-exports` | → redirect     |
| `/legacy-dashboard`              | Explicitly named "legacy"                 | → remove       |
| `/vision-lab-legacy`             | Superseded by `/vision-lab`               | → remove       |
| `/claimiq`                       | Standalone experiment                     | → investigate  |
| `/builder`                       | Too generic, unclear purpose              | → investigate  |
| `/performance`                   | Duplicate of `/analytics/performance`     | → redirect     |
| `/evidence`                      | Standalone evidence page                  | → investigate  |
| `/report-builder`                | Duplicate of reports/builder              | → redirect     |
| `/carrier-exports`               | Duplicate of `/documents/carrier-exports` | → redirect     |
| `/tools`                         | Generic tools index                       | → remove       |
| `/mockup`                        | Duplicate of nav'd mockup-generator       | → redirect     |
| `/material-estimator-standalone` | Duplicate of nav'd material-estimator     | → redirect     |
| `/map`                           | Early version of `/maps/map-view`         | → redirect     |
| `/storm-map`                     | Third weather/maps intersection           | → redirect     |

---

## Gated Flows (Correctly Orphaned)

| Route                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `/onboarding`        | Post-signup wizard (contractor type selection)               |
| `/onboarding/start`  | Onboarding kickoff                                           |
| `/onboarding/wizard` | Multi-step setup                                             |
| `/getting-started`   | Progress checklist (8 steps)                                 |
| `/trades/onboarding` | Trades network onboarding                                    |
| `/trades/setup/*`    | Multi-step trades setup (company, portfolio, link, approval) |
| `/trial/ended`       | Trial expiration gate                                        |

---

## Internal/Dev Pages (Role-Gated)

These are admin/ops tools that should be behind `requireRole("ADMIN")`:

- `/admin` — Admin panel
- `/auto-onboard` — Automated test page
- `/deployment-proof` — Deployment verification
- `/governance/*` — Internal governance
- `/operations` — Ops dashboard
- `/settings/inspector` — Debug tool
- `/settings/deployment` — Deploy config
- `/settings/operations` — Ops settings
