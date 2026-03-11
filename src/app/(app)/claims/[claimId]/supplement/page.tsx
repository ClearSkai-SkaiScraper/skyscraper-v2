import SupplementWorkspace from "@/components/supplement/SupplementWorkspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function MembershipMissing() {
  return (
    <div className="p-8">
      <div className="max-w-xl space-y-4 rounded-xl border border-[color:var(--border)] p-6">
        <h1 className="text-2xl font-bold">Initialize Organization</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Complete onboarding to access claims supplements.
        </p>
        <a
          href="/onboarding/start"
          className="inline-flex items-center gap-2 rounded bg-[var(--primary)] px-4 py-2 text-white"
        >
          Start Onboarding
        </a>
      </div>
    </div>
  );
}
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="p-8">
      <div className="max-w-xl space-y-4 rounded-xl border border-red-500/40 bg-red-50 p-6 dark:bg-red-950">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-200">
          Supplement Unavailable
        </h1>
        <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
        <a href="/claims" className="inline-flex items-center gap-2 rounded border px-4 py-2">
          Claims
        </a>
      </div>
    </div>
  );
}

async function initSupplement(claimId: string) {
  try {
    const existing = await prisma.claim_supplements.findFirst({ where: { claim_id: claimId } });
    if (existing) return existing;
    const id = crypto.randomUUID();
    return await prisma.claim_supplements.create({
      data: {
        id,
        claim_id: claimId,
        status: "DRAFT",
        total_cents: 0,
        updated_at: new Date(),
      },
    });
  } catch (e) {
    logger.error("Failed to init supplement", e);
    return null;
  }
}

export default async function SupplementPage({ params }: { params: { claimId: string } }) {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated") return <MembershipMissing />;
  if (orgCtx.status === "noMembership") return <MembershipMissing />;
  if (orgCtx.status === "error") return <ErrorCard message="Organization context unavailable." />;
  const claims = await prisma.claims.findUnique({ where: { id: params.claimId } });
  if (!claims) return <ErrorCard message="Claim not found." />;
  if (claims.orgId !== orgCtx.orgId)
    return <ErrorCard message="Claim does not belong to current organization." />;
  await initSupplement(params.claimId);
  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[color:var(--text)]">Supplement Workspace</h1>
          <div className="text-sm text-[color:var(--muted)]">
            Claim #{claims.claimNumber || params.claimId}
          </div>
        </div>
        <SupplementWorkspace
          claimId={params.claimId}
          claimNumber={claims.claimNumber || undefined}
        />
      </div>
    </div>
  );
}
