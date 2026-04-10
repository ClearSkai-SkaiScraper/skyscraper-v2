import * as Sentry from '@sentry/nextjs';

import { withDbSpan } from '@/lib/monitoring/dbSpan';
import { incrementDrift } from '@/lib/monitoring/driftMetrics';
import prisma from "@/lib/prisma";

export async function safeJobsSelect(orgId: string, take = 50) {
  try {
    const jobs = await withDbSpan('jobs.select.full', () => prisma.jobs.findMany({
      where: { orgId },
      select: { id: true, title: true, status: true, jobType: true, scheduledStart: true, scheduledEnd: true },
      orderBy: { createdAt: 'desc' },
      take
    }));
    Sentry.addBreadcrumb({ category: 'jobs', level: 'info', message: 'jobs.full.success', data: { count: jobs.length } });
    return jobs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase();
    const drift = msg.includes('does not exist') || msg.includes('column') || msg.includes('jobtype');
    if (!drift) throw e;
    Sentry.captureMessage('safeJobsSelect: drift detected; fallback applied', { level: 'warning', contexts: { error: { message: e?.message } } });
    incrementDrift('jobs');
    Sentry.addBreadcrumb({ category: 'jobs', level: 'warning', message: 'jobs.fallback.start' });
    try {
      const raw = await withDbSpan('jobs.select.fallback', () => prisma.jobs.findMany({
        where: { orgId },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take
      }));
      Sentry.addBreadcrumb({ category: 'jobs', level: 'info', message: 'jobs.fallback.success', data: { count: raw.length } });
      return raw.map(j => ({ id: j.id, title: j.title, status: null, jobType: null, scheduledStart: null, scheduledEnd: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (fallbackErr: any) {
      Sentry.captureMessage('safeJobsSelect: fallback failed', { level: 'error', contexts: { fallback: { message: fallbackErr?.message } } });
      return [];
    }
  }
}
