// High-level helper functions for uploads & retrieval using centralized storageConfig
import { logger } from "@/lib/logger";

import { storageConfig, storagePaths } from './config';

// NOTE: Actual upload implementations delegate to existing Firebase or Supabase utilities.
// We only construct paths + delegate to existing lower-level functions to avoid duplication.

// Lazy imports to avoid circular dependencies
async function getFirebaseUpload() {
  const mod = await import('./firebase-pdf-upload');
  return mod.uploadPDF as (path: string, buffer: Buffer) => Promise<string>;
}
async function getSupabaseUtils() {
  const mod = await import('../reports/pdf-utils');
  return mod.uploadReport as ({ bucket, key, buffer }: { bucket: string; key: string; buffer: Buffer }) => Promise<string>;
}

export interface UploadResult { url: string; path: string; bucket: string; provider: 'firebase' | 'supabase'; }

export async function uploadClaimPdf(claimId: string, buffer: Buffer): Promise<UploadResult> {
  const path = storagePaths.claimPdf(claimId);
  if (storageConfig.pdfs.provider === 'firebase' && process.env.FIREBASE_STORAGE_BUCKET) {
    try {
      const uploadPDF = await getFirebaseUpload();
      const url = await uploadPDF(path, buffer);
      return { url, path, bucket: storageConfig.pdfs.bucket, provider: 'firebase' };
    } catch (e) {
      logger.warn('[uploadClaimPdf] Firebase failed, falling back to Supabase', e);
    }
  }
  const uploadReport = await getSupabaseUtils();
  const key = path.replace(/^claims\//, ''); // keep structure simple in fallback bucket
  const url = await uploadReport({ bucket: storageConfig.supabaseFallback.claimReportsBucket, key, buffer });
  return { url, path, bucket: storageConfig.supabaseFallback.claimReportsBucket, provider: 'supabase' };
}

export async function uploadClaimPdfAI(claimId: string, buffer: Buffer): Promise<UploadResult> {
  const path = storagePaths.claimPdfAI(claimId);
  if (storageConfig.pdfs.provider === 'firebase' && process.env.FIREBASE_STORAGE_BUCKET) {
    try {
      const uploadPDF = await getFirebaseUpload();
      const url = await uploadPDF(path, buffer);
      return { url, path, bucket: storageConfig.pdfs.bucket, provider: 'firebase' };
    } catch (e) {
      logger.warn('[uploadClaimPdfAI] Firebase failed, falling back to Supabase', e);
    }
  }
  const uploadReport = await getSupabaseUtils();
  const key = path.replace(/^claims\//, '');
  const url = await uploadReport({ bucket: storageConfig.supabaseFallback.claimReportsBucket, key, buffer });
  return { url, path, bucket: storageConfig.supabaseFallback.claimReportsBucket, provider: 'supabase' };
}

// Branding accessors
export function buildBrandingLogoPath(orgId: string) {
  return storagePaths.brandingLogo(orgId);
}

// Trades network asset helpers
export function buildTradeLogoPath(tradeId: string) {
  return storagePaths.tradeLogo(tradeId);
}
export function buildTradeBrochurePath(tradeId: string, filename: string) {
  return storagePaths.tradeBrochure(tradeId, filename);
}
