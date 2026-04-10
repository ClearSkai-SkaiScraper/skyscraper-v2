// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export default async function DebugAuthPage() {
  const clerkAuth = await auth();
  const orgCtx = await safeOrgContext();

  // Get user record
  let userRecord: unknown = null;
  if (clerkAuth.userId) {
    try {
      userRecord = await prisma.users.findUnique({
        where: { clerkUserId: clerkAuth.userId },
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {}
  }

  // Get user_organizations records for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userOrgs: any[] = [];
  if (clerkAuth.userId) {
    try {
      userOrgs = await prisma.user_organizations.findMany({
        where: { userId: clerkAuth.userId },
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {}
  }

  // Get all orgs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allOrgs: any[] = [];
  try {
    allOrgs = await prisma.org.findMany({
      select: { id: true, name: true, clerkOrgId: true },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {}

  // Count leads and claims for each org
  const orgDataPromises = allOrgs.map(async (org) => {
    const leadCount = await prisma.leads.count({ where: { orgId: org.id } });
    const claimCount = await prisma.claims.count({ where: { orgId: org.id } });
    return { ...org, leadCount, claimCount };
  });
  const orgData = await Promise.all(orgDataPromises);

  return (
    <div className="container mx-auto space-y-8 p-8">
      <h1 className="mb-4 text-3xl font-bold">🔍 Auth Debug Panel</h1>

      <div className="space-y-4 rounded-lg border bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Clerk Auth</h2>
        <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs dark:bg-slate-800">
          {JSON.stringify(
            {
              userId: clerkAuth.userId,
              orgId: clerkAuth.orgId,
              sessionId: clerkAuth.sessionId,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">safeOrgContext()</h2>
        <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs dark:bg-slate-800">
          {JSON.stringify(orgCtx, null, 2)}
        </pre>
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">User Record (users table)</h2>
        <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs dark:bg-slate-800">
          {userRecord ? JSON.stringify(userRecord, null, 2) : "No user record found"}
        </pre>
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">user_organizations Records</h2>
        <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs dark:bg-slate-800">
          {userOrgs.length > 0
            ? JSON.stringify(userOrgs, null, 2)
            : "No user_organizations records found"}
        </pre>
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">All Orgs + Data Counts</h2>
        <div className="space-y-2">
          {orgData.map((org) => (
            <div key={org.id} className="rounded bg-slate-100 p-3 dark:bg-slate-800">
              <div className="font-semibold">{org.name}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
                ID: {org.id}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
                Clerk Org ID: {org.clerkOrgId}
              </div>
              <div className="mt-2 text-sm font-medium">
                📊 {org.leadCount} leads, {org.claimCount} claims
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
        <h2 className="mb-3 text-xl font-semibold">🎯 The Problem</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Demo data exists in org:</strong>{" "}
            <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900">
              cmhe0kl1j0000acz0am77w682
            </code>
          </p>
          <p>
            <strong>Your current org from safeOrgContext:</strong>{" "}
            <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900">
              {orgCtx.orgId || "NULL"}
            </code>
          </p>
          <p className="mt-4">
            {orgCtx.orgId === "cmhe0kl1j0000acz0am77w682" ? (
              <span className="font-semibold text-green-600 dark:text-green-400">
                ✅ You ARE in the demo org! Leads/claims should show up.
              </span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">
                ❌ You are NOT in the demo org. You need a user_organizations record linking your
                userId to the demo org.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <h2 className="mb-3 text-xl font-semibold">🔧 Fix</h2>
        <p className="mb-3 text-sm">If you need access to the demo org, run this SQL command:</p>
        <pre className="overflow-auto rounded bg-slate-900 p-4 text-xs text-green-400">
          {`INSERT INTO user_organizations (id, "userId", "orgId", role, "createdAt")
VALUES (
  gen_random_uuid()::text,
  '${clerkAuth.userId || "YOUR_CLERK_USER_ID"}',
  'cmhe0kl1j0000acz0am77w682',
  'ADMIN',
  NOW()
)
ON CONFLICT DO NOTHING;`}
        </pre>
      </div>
    </div>
  );
}
