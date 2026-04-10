/**
 * ensureOnboard - Idempotent onboarding setup
 *
 * Called after user signs in to ensure:
 * 1. Org exists in database
 * 2. User record exists
 * 3. Branding exists with safe defaults
 * 4. Starter tokens are allocated
 *
 * All operations are idempotent (safe to run multiple times)
 */

import { pool } from "@/server/db";

interface OnboardParams {
  userId: string;
  orgId: string;
  email?: string | null;
}

export async function ensureOnboard({ userId, orgId, email }: OnboardParams): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Ensure org exists (idempotent)
    await client.query(
      `INSERT INTO orgs (id, "clerkOrgId", "ownerId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [orgId, orgId, userId]
    );

    // 2) Ensure user record exists (idempotent)
    await client.query(
      `INSERT INTO users (id, "clerkUserId", email, "orgId", role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, 'MEMBER', NOW(), NOW())
       ON CONFLICT ("clerkUserId") DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         "updatedAt" = NOW()`,
      [userId, email, orgId]
    );

    // 3) Seed branding with safe defaults using our UPSERT function
    await client.query(`SELECT upsert_org_branding($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
      orgId, // p_org_id
      userId, // p_owner_id
      "Your Roofing Company LLC", // p_company_name (default)
      null, // p_license
      null, // p_phone
      email ?? null, // p_email
      null, // p_website
      "#117CFF", // p_color_primary
      "#FFC838", // p_color_accent
      null, // p_logo_url
      null, // p_team_photo_url
    ]);

    // 4) Starter tokens for new orgs (idempotent)
    // Give 2 credits each for ai, reports, dols
    const tokenKinds = ["ai", "reports", "dols"];
    for (const kind of tokenKinds) {
      await client.query(
        `INSERT INTO usage_tokens ("orgId", kind, balance, "createdAt", "updatedAt")
         VALUES ($1, $2, 2, NOW(), NOW())
         ON CONFLICT ("orgId", kind) DO NOTHING`,
        [orgId, kind]
      );
    }

    await client.query("COMMIT");

    // eslint-disable-next-line no-console
    console.log(`[ensureOnboard] ✅ Onboarded user ${userId} for org ${orgId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ensureOnboard] ❌ Failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
