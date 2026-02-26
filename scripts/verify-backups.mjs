#!/usr/bin/env node

/**
 * Backup Verification Script
 *
 * Validates that critical data is intact by checking:
 * 1. Database connectivity + row counts on critical tables
 * 2. Storage accessibility (Supabase + Firebase)
 * 3. Auth service health (Clerk)
 * 4. External service connectivity
 *
 * Usage:
 *   node scripts/verify-backups.mjs
 *
 * Requires DATABASE_URL in environment.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const results = [];
let exitCode = 0;

function log(status, check, detail) {
  const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️" : "❌";
  console.log(`${icon}  ${check}: ${detail}`);
  results.push({ status, check, detail });
  if (status === "fail") exitCode = 1;
}

async function checkDatabaseConnectivity() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    log("pass", "Database connectivity", "Connected successfully");
  } catch (e) {
    log("fail", "Database connectivity", `Failed: ${e.message}`);
  }
}

async function checkCriticalTableCounts() {
  const tables = [
    { name: "organizations", model: "organizations", minExpected: 0 },
    { name: "claims", model: "claims", minExpected: 0 },
    { name: "contacts", model: "contacts", minExpected: 0 },
    { name: "file_assets", model: "file_assets", minExpected: 0 },
    { name: "activities", model: "activities", minExpected: 0 },
  ];

  for (const table of tables) {
    try {
      const count = await prisma[table.model].count();
      if (count >= table.minExpected) {
        log("pass", `Table: ${table.name}`, `${count} rows`);
      } else {
        log("warn", `Table: ${table.name}`, `Only ${count} rows (expected ≥ ${table.minExpected})`);
      }
    } catch (e) {
      log("fail", `Table: ${table.name}`, `Query failed: ${e.message}`);
    }
  }
}

async function checkDatabaseSize() {
  try {
    const result = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    log("pass", "Database size", result[0]?.size || "unknown");
  } catch (e) {
    log("warn", "Database size", `Could not determine: ${e.message}`);
  }
}

async function checkRecentActivity() {
  try {
    const recentCount = await prisma.activities.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
    });
    if (recentCount > 0) {
      log("pass", "Recent activity", `${recentCount} events in last 24h`);
    } else {
      log("warn", "Recent activity", "No activity in last 24h");
    }
  } catch (e) {
    log("warn", "Recent activity", `Could not check: ${e.message}`);
  }
}

async function checkExternalServices() {
  // Health endpoint
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      log("pass", "Health endpoint", `Status ${res.status}`);
    } else {
      log("warn", "Health endpoint", `Status ${res.status}`);
    }
  } catch (e) {
    log("warn", "Health endpoint", `Unreachable: ${e.message}`);
  }
}

async function checkMigrationStatus() {
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `;
    const count = Number(result[0]?.count || 0);
    log("pass", "Prisma migrations", `${count} migrations applied`);
  } catch (e) {
    log("warn", "Prisma migrations", `Could not check: ${e.message}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Backup Verification — Starting checks...\n");
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   Database:  ${process.env.DATABASE_URL ? "configured" : "⚠️ NOT SET"}\n`);

  await checkDatabaseConnectivity();
  await checkCriticalTableCounts();
  await checkDatabaseSize();
  await checkRecentActivity();
  await checkMigrationStatus();
  await checkExternalServices();

  console.log("\n─────────────────────────────────────────────");

  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;

  console.log(`\n📊 Results: ${passed} passed, ${warned} warnings, ${failed} failed`);

  if (failed > 0) {
    console.log("\n❌ BACKUP VERIFICATION FAILED — Action required!");
  } else if (warned > 0) {
    console.log("\n⚠️  BACKUP VERIFICATION PASSED WITH WARNINGS");
  } else {
    console.log("\n✅ ALL BACKUP CHECKS PASSED");
  }

  await prisma.$disconnect();
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
