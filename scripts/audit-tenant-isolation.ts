/* eslint-disable no-console */
/**
 * RC-2 Phase 3 — Tenant Isolation Audit.
 *
 * Probes a set of high-risk routes with (1) a valid session and (2) a
 * cross-org target ID. Flags any response that leaks another tenant's data.
 *
 * Usage:
 *   SESSION_COOKIE="__session=..." \
 *   TARGET_ORG_B_CLAIM_ID=xxx \
 *   TARGET_ORG_B_REPORT_ID=yyy \
 *   TARGET_ORG_B_JOB_ID=zzz \
 *   pnpm tsx scripts/audit-tenant-isolation.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const COOKIE = process.env.SESSION_COOKIE || "";

const PROBES: Array<{ name: string; path: string; expectStatus: number[] }> = [
  {
    name: "Claim of another org",
    path: `/api/claims/${process.env.TARGET_ORG_B_CLAIM_ID || "missing"}`,
    expectStatus: [403, 404],
  },
  {
    name: "Report of another org",
    path: `/api/reports/${process.env.TARGET_ORG_B_REPORT_ID || "missing"}/pdf`,
    expectStatus: [403, 404],
  },
  {
    name: "Job-board private detail",
    path: `/api/trades/job-board/${process.env.TARGET_ORG_B_JOB_ID || "missing"}`,
    expectStatus: [403, 404],
  },
  {
    name: "Employees with cross-org query param",
    path: `/api/trades/company/employees?companyId=${process.env.TARGET_ORG_B_COMPANY_ID || "missing"}`,
    expectStatus: [200], // Must ignore param; verify response body is session org only
  },
  {
    name: "File signed URL of another org",
    path: `/api/files/${process.env.TARGET_ORG_B_FILE_ID || "missing"}/signed-url`,
    expectStatus: [403, 404],
  },
];

async function main() {
  if (!COOKIE) {
    console.error("Set SESSION_COOKIE env var first");
    process.exit(1);
  }

  let fails = 0;
  for (const p of PROBES) {
    const res = await fetch(`${BASE}${p.path}`, { headers: { Cookie: COOKIE } });
    const ok = p.expectStatus.includes(res.status);
    const body = await res.text().catch(() => "");
    const marker = ok ? "✅" : "❌ LEAK?";
    console.log(`${marker}  ${p.name}`);
    console.log(`    ${res.status}  ${p.path}`);
    if (!ok) {
      fails += 1;
      console.log(`    body: ${body.slice(0, 280)}`);
    }
  }
  console.log(
    `\n${fails === 0 ? "✅ All probes within expected status" : `❌ ${fails} potential leaks`}`
  );
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
