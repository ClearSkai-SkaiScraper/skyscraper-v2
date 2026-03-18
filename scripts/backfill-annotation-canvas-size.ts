/**
 * Backfill old annotation metadata with default canvas dimensions.
 *
 * Before the coordinate-drift fix, handleSaveAnnotations used a hardcoded
 * 800×600 canvas for pixel→fraction conversion.  Annotations saved in that
 * era have no canvasWidth/canvasHeight in their metadata JSON, so when the
 * new code loads them it can't reverse the conversion correctly.
 *
 * This script finds every file_assets row whose metadata contains an
 * "annotations" key but is missing "canvasWidth", and sets the defaults
 * (800 × 600) so existing annotations render at the same coordinates.
 *
 * Usage:
 *   npx tsx scripts/backfill-annotation-canvas-size.ts          # dry-run
 *   npx tsx scripts/backfill-annotation-canvas-size.ts --apply   # apply
 */

import prisma from "../src/lib/prisma";

async function main() {
  const dryRun = !process.argv.includes("--apply");

  if (dryRun) {
    console.log("🔍 DRY RUN — pass --apply to write changes\n");
  }

  // Find file_assets rows that have annotations metadata but no canvasWidth
  const rows: Array<{ id: string; metadata: Record<string, unknown> }> = await prisma.$queryRaw`
      SELECT id, metadata
      FROM file_assets
      WHERE metadata IS NOT NULL
        AND metadata::text LIKE '%"annotations"%'
        AND NOT (metadata::text LIKE '%"canvasWidth"%')
    `;

  console.log(`Found ${rows.length} file_assets row(s) with annotations missing canvasWidth.\n`);

  if (rows.length === 0) {
    console.log("✅ Nothing to backfill.");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const meta = row.metadata as Record<string, unknown>;

    // Safety: skip if annotations is empty or already has canvas dimensions
    if (meta.canvasWidth || meta.canvasHeight) {
      skipped++;
      continue;
    }

    const patched = {
      ...meta,
      canvasWidth: 800,
      canvasHeight: 600,
    };

    if (dryRun) {
      console.log(`  [DRY] ${row.id} → canvasWidth=800, canvasHeight=600`);
    } else {
      await prisma.$executeRaw`
        UPDATE file_assets
        SET metadata = ${JSON.stringify(patched)}::jsonb
        WHERE id = ${row.id}
      `;
      console.log(`  ✅ ${row.id} updated`);
    }
    updated++;
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"}: ${updated}  |  Skipped: ${skipped}  |  Total: ${rows.length}`
  );
}

main()
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
