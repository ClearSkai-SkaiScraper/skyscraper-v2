// NOTE: Placeholder draft module intentionally disabled (no JobDraft model).
// Removed deprecated jobDraft references to reduce schema mismatch noise.

// Prisma singleton imported from @/lib/db/prisma

export type UpsertDraftPayload = {
  draftId?: string;
  step: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

/**
 * Upsert a job draft for the given user
 */
export async function upsertDraft(
  _userId: string,
  _orgId: string | null,
  _payload: UpsertDraftPayload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // const { draftId, step, data } = payload;
  throw new Error("Draft system not implemented");

  // if (draftId) {
  //   // Update existing draft
  //   return prisma.jobDraft.update({
  //     where: {
  //       id: draftId,
  //       userId,
  //     },
  //     data: {
  //       step,
  //       data,
  //       updatedAt: new Date(),
  //     },
  //   });
  // }

  // // Check if user already has a draft for this org
  // const existing = await prisma.jobDraft.findFirst({
  //   where: {
  //     userId,
  //     orgId: orgId ?? undefined,
  //   },
  //   orderBy: {
  //     updatedAt: "desc",
  //   },
  // });

  // if (existing) {
  //   // Update the most recent draft
  //   return prisma.jobDraft.update({
  //     where: { id: existing.id },
  //     data: {
  //       step,
  //       data,
  //       updatedAt: new Date(),
  //     },
  //   });
  // }

  // // Create new draft
  // return prisma.jobDraft.create({
  //   data: {
  //     userId,
  //     orgId: orgId ?? undefined,
  //     step,
  //     data,
  //   },
  // });
}

/**
 * Get the most recent draft for a user
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLatestDraft(_userId: string, _orgId: string | null): Promise<any> {
  throw new Error("Draft system not implemented");

  // return prisma.jobDraft.findFirst({
  //   where: {
  //     userId,
  //     orgId: orgId ?? undefined,
  //   },
  //   orderBy: {
  //     updatedAt: "desc",
  //   },
  // });
}

/**
 * Delete a draft
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteDraft(_draftId: string, _userId: string): Promise<any> {
  throw new Error("Draft system not implemented");

  // return prisma.jobDraft.delete({
  //   where: {
  //     id: draftId,
  //     userId,
  //   },
  // });
}
