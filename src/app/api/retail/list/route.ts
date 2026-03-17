/**
 * /api/retail/list/route.ts
 *
 * GET endpoint to list all retail packets for current user
 * Returns:
 * - packets: Array of retail_packets
 * - Sorted by updated_at DESC
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/observability/logger";
import { getStorageClient } from "@/lib/storage/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
    }

    // Check if table exists
    const { data: tableExists } = await supabase.from("retail_packets").select("id").limit(1);

    if (!tableExists) {
      return NextResponse.json({
        ok: true,
        packets: [],
        description: "DB_NOT_MIGRATED",
      });
    }

    // Fetch all packets for user
    const { data: packets, error } = await supabase
      .from("retail_packets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error("[API /retail/list] Supabase error:", error);
      return NextResponse.json({ ok: false, error: "DATABASE_ERROR" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      packets: packets || [],
    });
  } catch (err) {
    logger.error("[API /retail/list] Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
