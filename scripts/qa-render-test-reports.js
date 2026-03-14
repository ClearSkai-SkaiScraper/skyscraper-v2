#!/usr/bin/env node
/**
 * QA Render Test — Damage Report v2
 *
 * Tests the damage report generation endpoint with various configurations
 * to validate page geometry, shape rendering, caption styles, and AZ codes.
 *
 * Usage:
 *   node scripts/qa-render-test-reports.js [BASE_URL]
 *
 * Environment:
 *   QA_CLAIM_ID    — Claim ID to test against (required)
 *   QA_AUTH_TOKEN   — Bearer token for auth (required)
 *   BASE_URL        — Base URL (default: http://localhost:3000)
 */

const BASE_URL = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const CLAIM_ID = process.env.QA_CLAIM_ID;
const AUTH_TOKEN = process.env.QA_AUTH_TOKEN;

if (!CLAIM_ID || !AUTH_TOKEN) {
  console.error("❌ Missing required env vars:");
  console.error("   QA_CLAIM_ID   — Claim ID to test");
  console.error("   QA_AUTH_TOKEN  — Bearer auth token");
  console.error("");
  console.error("Usage: QA_CLAIM_ID=xxx QA_AUTH_TOKEN=yyy node scripts/qa-render-test-reports.js");
  process.exit(1);
}

const ENDPOINT = `${BASE_URL}/api/claims/${CLAIM_ID}/damage-report`;
const PREVIEW_ENDPOINT = `${BASE_URL}/api/claims/${CLAIM_ID}/damage-report/preview`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${AUTH_TOKEN}`,
};

// ============================================================================
// Test Scenarios
// ============================================================================
const scenarios = [
  {
    name: "Default (full captions, claim-value order)",
    body: {},
  },
  {
    name: "Concise captions, severity order",
    body: {
      captionStyle: "concise",
      photoOrder: "severity",
    },
  },
  {
    name: "Code-only captions, upload order",
    body: {
      captionStyle: "code-only",
      photoOrder: "upload-order",
    },
  },
  {
    name: "No building codes",
    body: {
      includeBuildingCodes: false,
    },
  },
  {
    name: "No repairability",
    body: {
      includeRepairability: false,
    },
  },
  {
    name: "Print-safe mode",
    body: {
      printSafe: true,
    },
  },
  {
    name: "No photos (text-only report)",
    body: {
      includePhotos: false,
    },
  },
  {
    name: "No annotations",
    body: {
      includeAnnotations: false,
    },
  },
  {
    name: "Full options — everything enabled",
    body: {
      captionStyle: "full",
      photoOrder: "claim-value",
      layout: "single",
      printSafe: true,
      includeRepairability: true,
      includeBuildingCodes: true,
      includePhotos: true,
      includeAnnotations: true,
    },
  },
];

// ============================================================================
// Runner
// ============================================================================
async function runTest(scenario, index) {
  const label = `[${index + 1}/${scenarios.length}] ${scenario.name}`;
  console.log(`\n🔄 ${label}...`);

  const start = Date.now();

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(scenario.body),
    });

    const elapsed = Date.now() - start;
    const data = await res.json();

    if (res.ok && data.success) {
      console.log(`   ✅ PASS — ${elapsed}ms`);
      console.log(
        `      Pages: ${data.pageCount}, Photos: ${data.photoCount}, Findings: ${data.findingCount}`
      );
      if (data.generationTimeMs) console.log(`      Server time: ${data.generationTimeMs}ms`);
      if (data.isArizona) console.log(`      🌵 Arizona codes applied`);
      console.log(`      PDF: ${data.pdfUrl}`);
      return { name: scenario.name, status: "PASS", elapsed, data };
    } else {
      console.log(`   ❌ FAIL — ${res.status} ${elapsed}ms`);
      console.log(`      Error: ${data.message || data.error || JSON.stringify(data)}`);
      return { name: scenario.name, status: "FAIL", elapsed, error: data };
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`   💥 ERROR — ${elapsed}ms`);
    console.log(`      ${err.message}`);
    return { name: scenario.name, status: "ERROR", elapsed, error: err.message };
  }
}

async function runPreviewTest() {
  console.log("\n🔄 [Preview] Testing report preview endpoint...");
  const start = Date.now();

  try {
    const res = await fetch(PREVIEW_ENDPOINT, { headers });
    const elapsed = Date.now() - start;
    const data = await res.json();

    if (res.ok && data.success) {
      const p = data.preview;
      console.log(`   ✅ PASS — ${elapsed}ms`);
      console.log(`      Claim: ${p.claim.claimNumber || p.claim.id}`);
      console.log(`      Photos: ${p.summary.totalPhotos}, Findings: ${p.summary.totalFindings}`);
      console.log(`      Codes: ${p.summary.buildingCodesCount}`);
      console.log(
        `      Severity: severe=${p.summary.severityCounts.severe}, moderate=${p.summary.severityCounts.moderate}, minor=${p.summary.severityCounts.minor}`
      );
      if (p.claim.isArizona) console.log(`      🌵 Arizona jurisdiction detected`);
      return { name: "Preview API", status: "PASS", elapsed };
    } else {
      console.log(`   ❌ FAIL — ${res.status} ${elapsed}ms`);
      return { name: "Preview API", status: "FAIL", elapsed, error: data };
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`   💥 ERROR — ${elapsed}ms`);
    return { name: "Preview API", status: "ERROR", elapsed, error: err.message };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  QA RENDER TEST — Damage Report v2");
  console.log(`  Base URL:  ${BASE_URL}`);
  console.log(`  Claim ID:  ${CLAIM_ID}`);
  console.log(`  Scenarios: ${scenarios.length + 1}`);
  console.log("═══════════════════════════════════════════════════════════════");

  const results = [];

  // Preview test first (read-only, fast)
  results.push(await runPreviewTest());

  // Generate tests (creates actual PDFs)
  for (let i = 0; i < scenarios.length; i++) {
    results.push(await runTest(scenarios[i], i));
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const errors = results.filter((r) => r.status === "ERROR").length;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "💥";
    console.log(`  ${icon} ${r.name} (${r.elapsed}ms)`);
  }

  console.log("");
  console.log(`  Total: ${results.length} | ✅ ${passed} | ❌ ${failed} | 💥 ${errors}`);
  console.log("═══════════════════════════════════════════════════════════════");

  process.exit(failed + errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
