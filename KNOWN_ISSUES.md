# Known Issues Register

> Last updated: April 16, 2026

## P0 — None remaining

All P0 issues resolved in Sprint A + B.

## P1 — Next sprint

| #   | Issue                                                        | Impact                            | Location                            | Mitigation                                    |
| --- | ------------------------------------------------------------ | --------------------------------- | ----------------------------------- | --------------------------------------------- |
| 1   | ClientProConnection status casing drift                      | Queries use multi-case fallbacks  | ~12 files across api + components   | Need data migration to normalize to lowercase |
| 2   | Claim status uses both lowercase and PipelineStage UPPERCASE | Some queries may miss records     | Dashboard/pipeline components       | Align claim.status writes to one convention   |
| 3   | ~30 mutation endpoints lack rate limiting                    | Abuse risk on email/invite routes | Various POST routes                 | Add rate limits to email-sending routes first |
| 4   | Demo AI chat (`/api/dominus/demo`) unauthenticated           | OpenAI cost vector                | `src/app/api/dominus/demo/route.ts` | Add IP-based rate limiting                    |

## P2 — After launch

| #   | Issue                                                                      | Impact                           | Location                                                             | Mitigation                                               |
| --- | -------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| 5   | Raw `<button>` in modules/ directory                                       | Cosmetic inconsistency           | `src/app/(app)/modules/` (~30 instances)                             | Refactor to use `<Button>` component                     |
| 6   | Legacy RBAC systems still importable                                       | Code confusion                   | `src/lib/rbac.ts` (System A), `src/lib/access-control.ts` (System C) | Delete deprecated files, update importers                |
| 7   | Sprint 27 constants include `owner` role not in canonical RBAC             | Potential confusion              | `src/lib/constants.ts`                                               | Align or remove                                          |
| 8   | Role presets in rolePresets has 9 roles vs 4 canonical                     | Enterprise roles not enforced    | `src/lib/auth/rolePresets.ts`                                        | Reconcile with canonical RBAC when enterprise roles ship |
| 9   | Supplement items use ad-hoc lowercase statuses                             | Semantic inconsistency           | Supplement item components                                           | Align with SupplementStatus enum                         |
| 10  | Inspector completeness calculator not yet wired to inspector settings page | UI shows old 7-field calculation | `src/app/(app)/settings/inspector/page.tsx`                          | Import `calculateInspectorStrength` from shared lib      |

## Accepted / Won't Fix

| #   | Issue                                                                             | Reason                                                                               |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A1  | Upload routes (avatar/cover/portfolio) user-scoped not org-scoped                 | User-owned assets are correctly scoped to userId                                     |
| A2  | Reviews GET endpoint is public (no auth)                                          | Reviews are intentionally public-facing for contractor discovery                     |
| A3  | trade_reviews uses lowercase "published" while reviews uses UPPERCASE "PUBLISHED" | Two separate models with different schema conventions — both correct for their model |
