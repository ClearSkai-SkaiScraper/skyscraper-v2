/**
 * POST /api/team/import-csv
 *
 * Bulk import team members from CSV data.
 * Accepts a JSON body with a `rows` array of { email, role?, name? } objects.
 * Creates Clerk org invitations for each valid email.
 *
 * RBAC: ADMIN or OWNER only — bulk imports are a sensitive operation.
 *
 * Request Body:
 * {
 *   rows: [
 *     { email: "alice@example.com", role: "member", name: "Alice Smith" },
 *     { email: "bob@example.com" }
 *   ]
 * }
 *
 * OR: raw CSV text (Content-Type: text/csv)
 *   email,role,name
 *   alice@example.com,member,Alice Smith
 *   bob@example.com,,
 *
 * Response:
 * {
 *   imported: 45,
 *   skipped: 3,
 *   errors: [{ email: "bad-email", reason: "Invalid email format" }],
 *   invitations: [{ email, role, status }]
 * }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

// ── Validation ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VALID_ROLES = ["member", "admin", "org:member", "org:admin"] as const;

const RowSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((e) => e.toLowerCase().trim()),
  role: z.string().optional().default("member"),
  name: z.string().optional(),
});

const ImportBodySchema = z.object({
  rows: z
    .array(RowSchema)
    .min(1, "At least one row required")
    .max(500, "Maximum 500 rows per import"),
});

// ── CSV Parser ────────────────────────────────────────────────────────────
function parseCSV(text: string): Array<{ email: string; role?: string; name?: string }> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("email") || firstLine.includes("name") || firstLine.includes("role");
  const startIdx = hasHeader ? 1 : 0;

  // Parse header to determine column order
  let emailCol = 0;
  let roleCol = 1;
  let nameCol = 2;

  if (hasHeader) {
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
    emailCol = headers.indexOf("email");
    roleCol = headers.indexOf("role");
    nameCol = headers.indexOf("name");
    // Fallback if "email" header not found but first column looks like emails
    if (emailCol === -1) emailCol = 0;
  }

  const rows: Array<{ email: string; role?: string; name?: string }> = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const email = cols[emailCol]?.trim();
    if (!email) continue;

    rows.push({
      email,
      role: roleCol >= 0 ? cols[roleCol]?.trim() || undefined : undefined,
      name: nameCol >= 0 ? cols[nameCol]?.trim() || undefined : undefined,
    });
  }

  return rows;
}

// ── Normalize role to Clerk format ────────────────────────────────────────
function normalizeRole(role?: string): "org:admin" | "org:member" {
  if (!role) return "org:member";
  const lower = role.toLowerCase().trim();
  if (lower === "admin" || lower === "org:admin" || lower === "owner" || lower === "manager") {
    return "org:admin";
  }
  return "org:member";
}

// ── Handler ───────────────────────────────────────────────────────────────
export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    let rows: Array<{ email: string; role?: string; name?: string }> = [];

    // Support both JSON and CSV content types
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      const text = await req.text();
      rows = parseCSV(text);
    } else {
      const body = await req.json();

      // If body has a `csv` string field, parse it
      if (typeof body.csv === "string") {
        rows = parseCSV(body.csv);
      } else {
        const parsed = ImportBodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: parsed.error.flatten().fieldErrors,
            },
            { status: 400 }
          );
        }
        rows = parsed.data.rows;
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in import data" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 invitations per batch. Split into multiple imports." },
        { status: 400 }
      );
    }

    // ── De-duplicate by email ─────────────────────────────────────
    const seen = new Set<string>();
    const uniqueRows = rows.filter((row) => {
      const email = row.email.toLowerCase().trim();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    // eslint-disable-next-line @typescript-eslint/await-thenable
    // ── Process invitations ───────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const client = await clerkClient();
    const results: Array<{ email: string; role: string; status: string }> = [];
    const errors: Array<{ email: string; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    // Process in batches of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
      const batch = uniqueRows.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (row) => {
        const email = row.email.toLowerCase().trim();

        // Basic email validation
        if (!email || !email.includes("@") || !email.includes(".")) {
          errors.push({ email: email || "(empty)", reason: "Invalid email format" });
          skipped++;
          return;
        }

        const clerkRole = normalizeRole(row.role);

        try {
          const invitation = await client.organizations.createOrganizationInvitation({
            organizationId: orgId,
            emailAddress: email,
            role: clerkRole,
            inviterUserId: userId,
          });

          results.push({
            email,
            role: clerkRole,
            status: invitation.status || "pending",
          });
          imported++;
        } catch (err) {
          if (err.errors?.[0]?.code === "duplicate_record") {
            errors.push({ email, reason: "Already invited" });
            skipped++;
          } else if (err.errors?.[0]?.code === "already_a_member_of_organization") {
            errors.push({ email, reason: "Already a member" });
            skipped++;
          } else {
            errors.push({
              email,
              reason: err.errors?.[0]?.message || err.message || "Invitation failed",
            });
            skipped++;
          }
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < uniqueRows.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logger.debug(
      `[team/import-csv] org=${orgId} imported=${imported} skipped=${skipped} errors=${errors.length}`
    );

    return NextResponse.json({
      imported,
      skipped,
      total: uniqueRows.length,
      errors: errors.length > 0 ? errors : undefined,
      invitations: results,
    });
  } catch (error) {
    logger.error("[team/import-csv] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import team members" },
      { status: 500 }
    );
  }
});
