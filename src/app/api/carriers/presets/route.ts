export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Phase 5 - Carrier Presets API Route
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { logger } from "@/lib/logger";
import { BUILT_IN_CARRIERS } from '@/modules/carriers/core/presets';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      presets: BUILT_IN_CARRIERS,
    });
  } catch (error) {
    logger.error('Error fetching carrier presets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
