import * as Sentry from '@sentry/nextjs';

import { withDbSpan } from '@/lib/monitoring/dbSpan';
import { incrementDrift } from '@/lib/monitoring/driftMetrics';
import prisma from "@/lib/prisma";

export async function safeProjectsSelect(orgId: string, take = 50) {
  try {
    const projects = await withDbSpan('projects.select.full', () => prisma.projects.findMany({
      where: { orgId },
      select: { id: true, title: true, status: true, jobNumber: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take
    }));
    Sentry.addBreadcrumb({ category: 'projects', level: 'info', message: 'projects.full.success', data: { count: projects.length } });
    return projects;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase();
    const drift = msg.includes('does not exist') || msg.includes('column') || msg.includes('jobnumber');
    if (!drift) throw e;
    Sentry.captureMessage('safeProjectsSelect: drift detected; fallback applied', { level: 'warning', contexts: { error: { message: e?.message } } });
    incrementDrift('projects');
    Sentry.addBreadcrumb({ category: 'projects', level: 'warning', message: 'projects.fallback.start' });
    try {
      const raw = await withDbSpan('projects.select.fallback', () => prisma.projects.findMany({
        where: { orgId },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take
      }));
      Sentry.addBreadcrumb({ category: 'projects', level: 'info', message: 'projects.fallback.success', data: { count: raw.length } });
      return raw.map(p => ({ id: p.id, title: p.title, status: null, jobNumber: null, createdAt: null, updatedAt: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (fallbackErr: any) {
      Sentry.captureMessage('safeProjectsSelect: fallback failed', { level: 'error', contexts: { fallback: { message: fallbackErr?.message } } });
      return [];
    }
  }
}
