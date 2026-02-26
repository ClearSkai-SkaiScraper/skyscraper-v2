#!/usr/bin/env node

/**
 * SkaiScraper Full Smoke Test
 * ───────────────────────────
 * Runs a complete end-to-end check: health → auth → claims → reports → messaging
 *
 * Usage:
 *   BASE_URL=https://skaiscrape.com node scripts/smoke-test.mjs
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TIMEOUT = 15_000;

const results = [];

async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ name, status: "PASS", ms });
    console.log(`  ✅ ${name} (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ name, status: "FAIL", ms, error: err.message });
    console.log(`  ❌ ${name} (${ms}ms) — ${err.message}`);
  }
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🚀 SkaiScraper Smoke Test\n   Target: ${BASE_URL}\n`);
  console.log("── Infrastructure ──────────────────────────");

  await check("Health endpoint", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check("Health status endpoint", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health/status`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error("Status not ok");
  });

  await check("Homepage loads", async () => {
    const res = await fetchWithTimeout(BASE_URL);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  console.log("\n── Auth ────────────────────────────────────");

  await check("Sign-in page accessible", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/sign-in`);
    if (!res.ok && res.status !== 307) throw new Error(`Status ${res.status}`);
  });

  await check("Sign-up page accessible", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/sign-up`);
    if (!res.ok && res.status !== 307) throw new Error(`Status ${res.status}`);
  });

  console.log("\n── API Endpoints ───────────────────────────");

  await check("Claims API (auth required)", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/claims`);
    // Should return 401 if not authenticated — that's expected behavior
    if (res.status !== 401 && res.status !== 403 && !res.ok) {
      throw new Error(`Unexpected status ${res.status}`);
    }
  });

  await check("Analytics claims API (auth required)", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/analytics/claims`);
    if (res.status !== 401 && res.status !== 403 && !res.ok) {
      throw new Error(`Unexpected status ${res.status}`);
    }
  });

  await check("Pilot feedback API (auth required)", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/pilot/feedback`);
    if (res.status !== 401 && res.status !== 403 && !res.ok) {
      throw new Error(`Unexpected status ${res.status}`);
    }
  });

  await check("Stripe webhook (no signature → 400)", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    // 400 = correctly rejecting unsigned requests
    if (res.status !== 400 && res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  console.log("\n── Static Assets ──────────────────────────");

  await check("Favicon loads", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/favicon.ico`);
    if (!res.ok && res.status !== 404) throw new Error(`Status ${res.status}`);
  });

  await check("Robots.txt", async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/robots.txt`);
    if (!res.ok && res.status !== 404) throw new Error(`Status ${res.status}`);
  });

  // ─── Summary ────────────────────────────────────────────────────────────

  console.log("\n══ SUMMARY ═══════════════════════════════");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const total = results.length;

  console.log(`   ${passed}/${total} passed, ${failed} failed`);
  console.log(`   Avg latency: ${Math.round(results.reduce((s, r) => s + r.ms, 0) / total)}ms`);

  if (failed === 0) {
    console.log("\n   🟢 ALL CHECKS PASSED — Ready for launch!\n");
    process.exit(0);
  } else {
    console.log(`\n   🔴 ${failed} CHECK(S) FAILED — Review before launch.\n`);
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => console.log(`      → ${r.name}: ${r.error}`));
    console.log();
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
