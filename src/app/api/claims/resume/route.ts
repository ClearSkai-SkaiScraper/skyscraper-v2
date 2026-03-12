/**
 * GET /api/claims/resume
 *
 * Fetches latest draft claim_report for authenticated user.
 * Similar to /api/retail/resume but uses claim_reports table
 */

import "server-only";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (process.env.FEATURE_AUTOSAVE === "false") {
      return NextResponse.json({ ok: false, reason: "FEATURE_DISABLED" }, { status: 200 });
    }

    const env = getSupabaseEnv();
    if (!env) {
      return NextResponse.json({ ok: false, reason: "NO_SUPABASE_SERVICE_ROLE" }, { status: 200 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(env.url, env.key, {
      auth: { persistSession: false },
    });

    const tableCheck = await supabase.from("claim_reports").select("id").limit(1);

    if (tableCheck.error && tableCheck.error.message?.includes("relation")) {
      return NextResponse.json({ ok: false, reason: "DB_NOT_MIGRATED" }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("claim_reports")
      .select("id, current_step, data, updated_at")
      .eq("userId", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      logger.error("[CLAIMS_RESUME] Query failed", { error: error.message });
      return NextResponse.json({ ok: false, reason: "QUERY_FAILED" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, reason: "NO_DRAFT_FOUND" }, { status: 200 });
    }

    const draft = data[0];
    return NextResponse.json({
      ok: true,
      reportId: draft.id,
      currentStep: draft.current_step ?? 1,
      data: draft.data ?? {},
      updatedAt: draft.updated_at,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "UNEXPECTED", detail: err?.message ?? "Unknown error" },
      { status: 200 }
    );
  }
}
