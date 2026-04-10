// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import prisma from "@/lib/prisma";

import EditArtifactClient from "./EditArtifactClient";

interface EditArtifactPageProps {
  params: Promise<{
    claimId: string;
    artifactId: string;
  }>;
}

export default async function EditArtifactPage({ params }: EditArtifactPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const resolvedParams = await params;
  const { claimId, artifactId } = resolvedParams;

  // Get user's org
  const user = await prisma.users.findUnique({
    where: { clerkUserId: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    return notFound();
  }

  // Get claim (verify org access)
  const claim = await prisma.claims.findFirst({
    where: {
      id: claimId,
      orgId: user.orgId,
    },
    select: {
      id: true,
      claimNumber: true,
    },
  });

  if (!claim) {
    return notFound();
  }

  // Get artifact
  const artifact = await prisma.ai_reports.findFirst({
    where: {
      id: artifactId,
      claimId,
      orgId: user.orgId,
    },
  });

  if (!artifact) {
    return notFound();
  }

  const content = artifact.content || JSON.stringify(artifact.attachments, null, 2);

  return (
    <EditArtifactClient
      claimId={claimId}
      artifactId={artifactId}
      initialData={{
        title: artifact.title,
        content,
        type: artifact.type,
        status: artifact.status,
        claimNumber: claim.claimNumber,
      }}
    />
  );
}
