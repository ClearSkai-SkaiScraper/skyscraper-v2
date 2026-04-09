export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { logger } from "@/lib/logger";
import { toPlainJSON } from "@/lib/serialize";

export async function GET() {
  // 🚑 DEV BYPASS: Skip network metrics in local dev to avoid TLS errors
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      likes: 0,
      comments: 0,
      lastActivityAt: null,
      _note: "Network metrics disabled in local dev",
    });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = `
      select
        coalesce(count(*) filter (where liked), 0)::bigint as likes,
        coalesce(count(comment_text), 0)::bigint as comments,
        max(updated_at) as last_activity_at
      from "trades_feed_engagement"
      where user_id = $1
    `;
    const { rows } = await pool.query(sql, [userId]);
    const row = rows[0] || { likes: 0, comments: 0, last_activity_at: null };
    return NextResponse.json(
      toPlainJSON({
        likes: Number(row.likes || 0),
        comments: Number(row.comments || 0),
        lastActivityAt: row.last_activity_at,
      })
    );
  } catch {
    // Table may not exist in all environments — return safe defaults
    return NextResponse.json({ likes: 0, comments: 0, lastActivityAt: null });
  }
}
