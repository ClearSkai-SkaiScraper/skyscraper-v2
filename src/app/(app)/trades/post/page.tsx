// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { X } from "lucide-react";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { Button } from "@/components/ui/button";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

import { CreatePostForm } from "./_components/CreatePostForm";

export const dynamic = "force-dynamic";

export default async function CreatePostPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { orgId, userId } = await getCurrentUserPermissions();
  if (!orgId || !userId) return <NoOrgMembershipBanner title="Create Post" />;

  // Fetch user's trades profile (employee membership)
  const userProfile = await prisma.tradesCompanyMember
    .findUnique({
      where: { userId },
    })
    .catch(() => null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 p-4 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[color:var(--text)]">Create Post</h1>
          <a href="/trades">
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </a>
        </div>

        <CreatePostForm userId={userId} profileId={userProfile?.id || null} />
      </div>
    </div>
  );
}
