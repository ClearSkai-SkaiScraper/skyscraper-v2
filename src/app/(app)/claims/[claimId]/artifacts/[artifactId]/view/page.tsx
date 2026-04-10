import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

interface ArtifactViewPageProps {
  params: Promise<{
    claimId: string;
    artifactId: string;
  }>;
}

export default async function ArtifactViewPage({ params }: ArtifactViewPageProps) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/claims/${claimId}/reports`}
                className="mb-2 inline-block text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to Reports
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{artifact.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>Claim: {claim.claimNumber}</span>
                <span>•</span>
                <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {artifact.type.replace(/_/g, " ")}
                </span>
                <span>•</span>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    artifact.status === "FINAL"
                      ? "bg-green-100 text-green-800"
                      : artifact.status === "SUBMITTED"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {artifact.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/claims/${claimId}/artifacts/${artifactId}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <form
                action={`/api/claims/${claimId}/artifacts/${artifactId}/export-pdf`}
                method="POST"
              >
                <Button type="submit" variant="outline">
                  Export PDF
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-8">
            {/* Metadata */}
            <div className="mb-6 border-b border-gray-200 pb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Created By:</span>{" "}
                  <span className="text-gray-900">{artifact.userName || "System"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created:</span>{" "}
                  <span className="text-gray-900">
                    {new Date(artifact.createdAt).toLocaleString()}
                  </span>
                </div>
                {artifact.updatedAt && artifact.updatedAt > artifact.createdAt && (
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span>{" "}
                    <span className="text-gray-900">
                      {new Date(artifact.updatedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Content */}
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans leading-relaxed text-gray-900">
                {content}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-between">
          <Link href={`/claims/${claimId}/reports`}>
            <Button variant="outline">← Back to Reports</Button>
          </Link>
          <Link href={`/claims/${claimId}/artifacts/${artifactId}/edit`}>
            <Button>Edit Document</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
