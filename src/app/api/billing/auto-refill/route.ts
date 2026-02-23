import { NextRequest, NextResponse } from "next/server";

// Token system removed — flat $80/month pricing.
// This route is kept as a stub to prevent 404s from cached clients.
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Token system has been removed. All features are included in the flat monthly plan." },
    { status: 410 } // 410 Gone
  );
}
