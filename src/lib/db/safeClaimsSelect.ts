import * as Sentry from '@sentry/nextjs';

import { withDbSpan } from '@/lib/monitoring/dbSpan';
import { incrementDrift } from '@/lib/monitoring/driftMetrics';
import prisma from "@/lib/prisma";

export async function safeClaimsSelect(orgId: string, take = 100) {
  try {
    const claims = await withDbSpan('claims.select.full', () => prisma.claims.findMany({
      where: { orgId },
      select: { id: true, claimNumber: true, damageType: true },
      orderBy: { createdAt: 'desc' },
      take
    }));
    Sentry.addBreadcrumb({ category: 'claims', level: 'info', message: 'claims.full.success', data: { count: claims.length, orgId } });
    return claims;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase();
    const drift = msg.includes('does not exist') || msg.includes('column') || msg.includes('claimnumber') || msg.includes('damage');
    if (!drift) throw e;
    Sentry.captureMessage('safeClaimsSelect: drift detected; applying fallback', { level: 'warning', contexts: { error: { message: e?.message } } });
    incrementDrift('claims');
    Sentry.addBreadcrumb({ category: 'claims', level: 'warning', message: 'claims.fallback.start', data: { orgId } });
    try {
      const raw = await withDbSpan('claims.select.fallback', () => prisma.claims.findMany({
        where: { orgId },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take
      }));
      const mapped = raw.map(r => ({ id: r.id, claimNumber: null, damageType: null }));
      Sentry.addBreadcrumb({ category: 'claims', level: 'info', message: 'claims.fallback.success', data: { count: mapped.length } });
      return mapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (fallbackErr: any) {
      Sentry.captureMessage('safeClaimsSelect: fallback failed', { level: 'error', contexts: { fallback: { message: fallbackErr?.message } } });
      return [];
    }
  }
}
