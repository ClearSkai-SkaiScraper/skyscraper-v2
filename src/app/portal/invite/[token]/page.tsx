// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { Clock } from "lucide-react";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptancePage({ params }: InvitePageProps) {
  const { userId } = await auth();
  const { token } = await params;

  // Find the invite by id (token is the ClaimClientLink id)
  const invite = await prisma.claimClientLink
    .findUnique({
      where: {
        id: token,
      },
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            title: true,
            orgId: true,
          },
        },
      },
    })
    .catch((error) => {
      logger.error("[Invite Page] Error fetching invite:", error);
      return null;
    });

  if (!invite) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
            <Clock className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Invalid or Expired Invite
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            This invitation link is no longer valid. Please contact your adjuster for a new invite.
          </p>
        </div>
      </div>
    );
  }

  // Check if already accepted or revoked
  if (invite.status !== "PENDING") {
    // Already accepted - redirect to claim portal (accept-invite API writes CONNECTED, page writes CONNECTED)
    if ((invite.status === "ACCEPTED" || invite.status === "CONNECTED") && invite.clientUserId) {
      redirect(`/portal/claims/${invite.claimId}`);
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Invitation No Longer Valid
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            This invitation has already been used or revoked. Please request a new invite from your
            adjuster.
          </p>
        </div>
      </div>
    );
  }

  // If not signed in, redirect to CLIENT sign-in with return URL
  // CRITICAL: Must use /client/sign-in so mode=client is set and user is
  // registered as a client, not a pro user.
  if (!userId) {
    const returnUrl = `/portal/invite/${token}`;
    redirect(`/client/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
  }

  // Verify signed-in user's email matches the invite's clientEmail
  // This prevents a different authenticated user from hijacking an invite link
  if (invite.clientEmail) {
    const user = await currentUser();
    const userEmails = user?.emailAddresses?.map((e) => e.emailAddress.toLowerCase()) ?? [];
    if (!userEmails.includes(invite.clientEmail.toLowerCase())) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
              Email Mismatch
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              This invitation was sent to <strong>{invite.clientEmail}</strong>. Please sign in with
              that email address to accept the invite.
            </p>
          </div>
        </div>
      );
    }
  }

  // Activate the invite - update status and link to user
  await prisma.claimClientLink.update({
    where: { id: invite.id },
    data: {
      status: "CONNECTED",
      clientUserId: userId,
      acceptedAt: new Date(),
    },
  });

  // Ensure client_access row exists so portal claim APIs work
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || invite.clientEmail;
  if (email) {
    await prisma.client_access.upsert({
      where: { claimId_email: { claimId: invite.claimId, email } },
      create: { id: crypto.randomUUID(), claimId: invite.claimId, email },
      update: {},
    });
  }

  // Redirect to the claim portal
  redirect(`/portal/claims/${invite.claimId}`);
}
