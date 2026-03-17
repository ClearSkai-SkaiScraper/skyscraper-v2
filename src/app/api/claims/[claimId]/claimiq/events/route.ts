export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ClaimIQ™ Readiness Events API
 *
 * GET /api/claims/{claimId}/claimiq/events?since=ISO_DATE
 *
 * Returns recent readiness change events for client-side polling.
 * The Zustand store polls this to auto-refresh after background changes.
 */

import { type NextRequest,NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { getRecentReadinessEvents } from "@/lib/claimiq/readiness-hooks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const { claimId } = await params;
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || undefined;

  const events = await getRecentReadinessEvents(claimId, since);

  return NextResponse.json({
    success: true,
    events,
    hasChanges: events.length > 0,
    lastEvent: events[events.length - 1] || null,
  });
}
