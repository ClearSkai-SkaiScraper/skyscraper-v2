import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import prisma from "@/lib/prisma";

export default async function ClientClaimPage({
  params,
  searchParams,
}: {
  params: { claimId: string };
  searchParams: { email?: string };
}) {
  // SECURITY: Require authentication
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) redirect("/client/sign-in");

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const email = searchParams.email;
  const { claimId } = params;

  // SECURITY: Verify the email param matches the signed-in user's email
  if (!email || !userEmail || email.toLowerCase() !== userEmail.toLowerCase()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[color:var(--text)]">Access Denied</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You don&apos;t have permission to view this claim. Please use the link sent to your
            email.
          </p>
        </div>
      </div>
    );
  }

  const access = await prisma.client_access.findFirst({
    where: { claimId, email: email },
    include: { claims: true },
  });

  if (!access) {
    notFound();
  }

  const claim = access.claims;

  // Load property data
  const property = claim.propertyId
    ? await prisma.properties.findUnique({ where: { id: claim.propertyId } })
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h1 className="text-3xl font-bold text-[color:var(--text)]">
            Claim #{claim.claimNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Secure client portal for {email}
          </p>
        </div>

        {/* Property Info */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[color:var(--text)]">
            Property Information
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Address:</span>
              <span className="text-[color:var(--text)]">
                {property?.street}, {property?.city}, {property?.state} {property?.zipCode}
              </span>
            </div>
            {property?.name && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Property Name:</span>
                <span className="text-[color:var(--text)]">{property?.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Status */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[color:var(--text)]">Claim Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Status:</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {claim.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Damage Type:</span>
              <span className="text-[color:var(--text)]">{claim.damageType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Date of Loss:</span>
              <span className="text-[color:var(--text)]">
                {new Date(claim.dateOfLoss).toLocaleDateString()}
              </span>
            </div>
            {claim.carrier && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Insurance Carrier:</span>
                <span className="text-[color:var(--text)]">{claim.carrier}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[color:var(--text)]">Documents</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">No documents uploaded yet.</p>
          {/* TODO: Add document list when PDF system is integrated */}
        </div>

        {/* Description */}
        {claim.description && (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text)]">Description</h2>
            <p className="text-sm text-[color:var(--text)]">{claim.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
