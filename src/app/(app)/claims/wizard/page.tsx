import Link from 'next/link';

import ClaimsWizard from '@/features/claims/wizard/ClaimsWizard';
import { getTenant } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ClaimsWizardPage({ searchParams }: { searchParams: { reportId?: string } }) {
  const orgId = await getTenant();
  if (!orgId) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-lg">
          <h1 className="mb-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">🚀 Initialize Workspace</h1>
          <p className="mb-6 text-[color:var(--muted)]">No organization detected. Complete onboarding to start the Claims Builder.</p>
          <div className="space-y-4">
            <Link href="/onboarding/start" className="rounded-lg bg-[var(--primary)] px-5 py-3 font-medium text-white shadow">🔧 Start Onboarding</Link>
            <Link href="/dashboard" className="rounded-lg border border-[color:var(--border)] px-5 py-3 font-medium">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // Provide resumeReportId via query param if present
  const resumeReportId = searchParams.reportId;

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ClaimsWizard resumeReportId={resumeReportId} />
      </div>
    </div>
  );
}
