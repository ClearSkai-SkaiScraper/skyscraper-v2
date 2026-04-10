/**
 * Database Photo Helpers
 * 
 * Lightweight utilities using pg for proposal photos.
 * Tables created by migrations, not yet in Prisma schema.
 */

import type { DamageReport } from "@/lib/ai/damage-schema";

import { q, qOne } from "./index";

// =============================================================================
// TYPES
// =============================================================================

export interface ProposalPhoto {
  id: string;
  proposal_id: string;
  org_id: string;
  userId: string;
  image_url: string;
  source?: string | null;
  created_at: string;
}

export interface PhotoFinding {
  id: string;
  proposal_id: string;
  photo_id: string;
  model: string;
  findings: DamageReport;
  severity: "none" | "minor" | "moderate" | "severe" | null;
  confidence: number | null;
  created_at: string;
}

// =============================================================================
// PHOTOS
// =============================================================================

/**
 * Insert a single photo
 */
export async function insertPhoto(
  proposalId: string,
  orgId: string,
  userId: string,
  imageUrl: string,
  source?: string
): Promise<ProposalPhoto> {
  const [photo] = await q<ProposalPhoto>(
    `INSERT INTO proposal_photos (proposal_id, org_id, userId, image_url, source)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5)
     RETURNING *`,
    [proposalId, orgId, userId, imageUrl, source || null]
  );
  return photo;
}

/**
 * Insert multiple photos in one statement
 */
export async function insertPhotos(
  proposalId: string,
  orgId: string,
  userId: string,
  urls: string[]
): Promise<Array<Pick<ProposalPhoto, "id" | "image_url">>> {
  const rows = await q<Pick<ProposalPhoto, "id" | "image_url">>(
    `INSERT INTO proposal_photos (proposal_id, org_id, userId, image_url)
     SELECT $1::uuid, $2::uuid, $3, url
     FROM unnest($4::text[]) AS url
     RETURNING id, image_url`,
    [proposalId, orgId, userId, urls]
  );
  return rows;
}

/**
 * Get all photos for a proposal
 */
export async function getPhotosForProposal(proposalId: string): Promise<ProposalPhoto[]> {
  return q<ProposalPhoto>(
    `SELECT * FROM proposal_photos WHERE proposal_id = $1::uuid ORDER BY created_at ASC`,
    [proposalId]
  );
}

/**
 * Get a single photo by ID
 */
export async function getPhoto(photoId: string): Promise<ProposalPhoto | null> {
  return qOne<ProposalPhoto>(
    `SELECT * FROM proposal_photos WHERE id = $1::uuid LIMIT 1`,
    [photoId]
  );
}

/**
 * Delete a photo
 */
export async function deletePhoto(photoId: string): Promise<void> {
  await q(`DELETE FROM proposal_photos WHERE id = $1::uuid`, [photoId]);
}

// =============================================================================
// FINDINGS
// =============================================================================

/**
 * Insert a damage finding
 */
export async function insertFinding(args: {
  proposalId: string;
  photoId: string;
  model: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findings: any;
  severity?: string;
  confidence?: number;
}): Promise<PhotoFinding> {
  const { proposalId, photoId, model, findings, severity, confidence } = args;

  const [finding] = await q<PhotoFinding>(
    `INSERT INTO photo_findings (proposal_id, photo_id, model, findings, severity, confidence)
     VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, $6)
     RETURNING *`,
    [proposalId, photoId, model, JSON.stringify(findings), severity ?? null, confidence ?? null]
  );
  return finding;
}

/**
 * Get all findings for a proposal
 */
export async function getFindingsForProposal(proposalId: string): Promise<Array<{
  finding_id: string;
  photo_id: string;
  image_url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findings: any;
  severity: string | null;
  confidence: number | null;
  created_at: string;
}>> {
  return q(
    `SELECT
      pf.id AS finding_id,
      pp.id AS photo_id,
      pp.image_url AS image_url,
      pf.findings AS findings,
      pf.severity AS severity,
      pf.confidence AS confidence,
      pf.created_at AS created_at
    FROM photo_findings pf
    JOIN proposal_photos pp ON pp.id = pf.photo_id
    WHERE pf.proposal_id = $1::uuid
    ORDER BY pf.created_at DESC`,
    [proposalId]
  );
}

/**
 * Get findings for a specific photo
 */
export async function getFindingsForPhoto(photoId: string): Promise<PhotoFinding[]> {
  return q<PhotoFinding>(
    `SELECT * FROM photo_findings WHERE photo_id = $1::uuid ORDER BY created_at ASC`,
    [photoId]
  );
}

// =============================================================================
// AGGREGATES
// =============================================================================

/**
 * Get photo count for a proposal
 */
export async function getPhotoCount(proposalId: string): Promise<number> {
  const [result] = await q<{ count: string }>(
    `SELECT COUNT(*) as count FROM proposal_photos WHERE proposal_id = $1::uuid`,
    [proposalId]
  );
  return parseInt(result.count, 10);
}

/**
 * Get finding count for a proposal
 */
export async function getFindingCount(proposalId: string): Promise<number> {
  const [result] = await q<{ count: string }>(
    `SELECT COUNT(*) as count FROM photo_findings WHERE proposal_id = $1::uuid`,
    [proposalId]
  );
  return parseInt(result.count, 10);
}

/**
 * Get highest severity finding for a proposal
 */
export async function getHighestSeverity(
  proposalId: string
): Promise<"none" | "minor" | "moderate" | "severe"> {
  const result = await q<{ severity: string }>(
    `SELECT severity FROM photo_findings 
     WHERE proposal_id = $1::uuid
     ORDER BY 
       CASE severity
         WHEN 'severe' THEN 4
         WHEN 'moderate' THEN 3
         WHEN 'minor' THEN 2
         WHEN 'none' THEN 1
       END DESC
     LIMIT 1`,
    [proposalId]
  );

  return result.length > 0 
    ? (result[0].severity as "none" | "minor" | "moderate" | "severe")
    : "none";
}

/**
 * Get photos with their findings nested
 */
export async function getPhotosWithFindings(proposalId: string): Promise<
  Array<ProposalPhoto & { findings: PhotoFinding[] }>
> {
  const photos = await getPhotosForProposal(proposalId);
  
  const photosWithFindings = await Promise.all(
    photos.map(async (photo) => {
      const findings = await getFindingsForPhoto(photo.id);
      return { ...photo, findings };
    })
  );

  return photosWithFindings;
}
