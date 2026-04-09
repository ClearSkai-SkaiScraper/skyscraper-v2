// app/api/retail/resume/route.ts
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// If you use Supabase, we can safely use the service role here (server-only)
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

    // Feature soft-guard (optional): allow disabling resume in some envs
    if (process.env.FEATURE_AUTOSAVE === "false") {
      return NextResponse.json({ ok: false, reason: "FEATURE_DISABLED" }, { status: 200 });
    }

    const env = getSupabaseEnv();
    if (!env) {
      // Soft error so UI can show a friendly banner instead of crashing
      return NextResponse.json({ ok: false, reason: "NO_SUPABASE_SERVICE_ROLE" }, { status: 200 });
    }

    // Lazy import to keep cold start smaller
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(env.url, env.key, {
      auth: { persistSession: false },
    });

    // Ensure table exists (soft check)
    const tableCheck = await supabase.from("retail_packets").select("id").limit(1);

    if (tableCheck.error && tableCheck.error.message?.includes("relation")) {
      // Table not migrated yet
      return NextResponse.json({ ok: false, reason: "DB_NOT_MIGRATED" }, { status: 200 });
    }

    // Fetch latest updated draft for this user
    const { data, error } = await supabase
      .from("retail_packets")
      .select("id, current_step, data, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false, reason: "QUERY_FAILED" }, { status: 200 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, reason: "NO_DRAFT_FOUND" }, { status: 200 });
    }

    const draft = data[0];
    return NextResponse.json({
      ok: true,
      packetId: draft.id,
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
