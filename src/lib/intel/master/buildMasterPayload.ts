// lib/intel/master/buildMasterPayload.ts
import prisma from "@/lib/prisma";

// Simplified stubbed payload: deep relational arrays are intentionally empty
// until underlying schema/relations are normalized. This minimizes type errors.
export interface MasterReportPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claim: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  estimates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supplements: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weatherReports: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damageAssessments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scopes: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photos: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documents: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspectionNotes: any[];
}

export async function buildMasterReportPayload({
  claimId,
  orgId,
}: {
  claimId: string;
  orgId: string;
}): Promise<MasterReportPayload> {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: {
      id: true,
      claimNumber: true,
      title: true,
      description: true,
      dateOfLoss: true,
      propertyId: true,
    },
  });

  if (!claim) throw new Error(`Claim ${claimId} not found or access denied`);

  return {
    claim,
    property: null,
    estimates: [],
    supplements: [],
    weatherReports: [],
    damageAssessments: [],
    scopes: [],
    photos: [],
    documents: [],
    payments: [],
    inspectionNotes: [],
  };
}
