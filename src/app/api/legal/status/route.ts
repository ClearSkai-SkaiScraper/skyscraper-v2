export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Scoped by userId — no cross-tenant risk
  const acceptances = await prisma.legal_acceptances.findMany({
    where: { userId: user.id },
    orderBy: { acceptedAt: "desc" },
  });

  const acceptancesWithMetadata = acceptances.map((acceptance) => {
    const docConfig = LEGAL_DOCUMENTS.find((d) => d.id === acceptance.documentId);
    return {
      documentId: acceptance.documentId,
      title: docConfig?.title || acceptance.documentId,
      version: acceptance.version,
      acceptedAt: acceptance.acceptedAt.toISOString(),
      isLatest: docConfig?.latestVersion === acceptance.version,
    };
  });

  return NextResponse.json({
    acceptances: acceptancesWithMetadata,
  });
}
