// Centralized Storage Configuration for all file domains
// DO NOT import firebase-admin directly here; this stays pure config.

export interface BucketConfig {
  provider: 'firebase' | 'supabase';
  bucket: string; // bucket or storage logical name
  basePath?: string; // optional prefix within bucket
}

export interface PdfDomainConfig extends BucketConfig {
  variants: {
    legacyClaim: string; // path pattern e.g. claims/<claimId>.pdf
    aiClaim: string;     // path pattern e.g. claims/<claimId>-ai.pdf
    retailProposal?: string; // proposals/<proposalId>.pdf
    weatherReport?: string;  // weather/<claimId>.pdf
  };
}

export interface StorageConfig {
  pdfs: PdfDomainConfig;
  claimAssets: BucketConfig; // photos / videos / docs tied to a claim
  generalAssets: BucketConfig; // miscellaneous non-claim assets
  branding: BucketConfig; // org branding logos & theme assets
  trades: BucketConfig; // vendor & trade network assets
  emails: {
    templatesDir?: string; // file-based templates path (if used)
    logsTable?: string;    // Prisma model/table name for email logs (future)
  };
  supabaseFallback: {
    claimReportsBucket: string; // Supabase bucket used when Firebase fails
  };
}

// Single source of truth. If environments differ, extend with env-based overrides.
export const storageConfig: StorageConfig = {
  pdfs: {
    provider: 'firebase',
    // eslint-disable-next-line no-restricted-syntax
    bucket: process.env.FIREBASE_STORAGE_BUCKET || 'firebase-primary-bucket',
    basePath: 'claims',
    variants: {
      legacyClaim: 'claims/<claimId>.pdf',
      aiClaim: 'claims/<claimId>-ai.pdf',
      retailProposal: 'proposals/<proposalId>.pdf',
      weatherReport: 'weather/<claimId>.pdf'
    }
  },
  claimAssets: {
    provider: 'supabase',
    bucket: 'claim-assets',
    basePath: 'claims'
  },
  generalAssets: {
    provider: 'supabase',
    bucket: 'general-assets',
    basePath: 'assets'
  },
  branding: {
    provider: 'supabase',
    bucket: 'branding',
    basePath: 'branding'
  },
  trades: {
    provider: 'supabase',
    bucket: 'trades-network',
    basePath: 'trades'
  },
  emails: {
    templatesDir: 'emails/templates',
    logsTable: 'email_logs' // (future enhancement)
  },
  supabaseFallback: {
    claimReportsBucket: 'reports-claims'
  }
};

// Path builders centralizing pattern substitution
export const storagePaths = {
  claimPdf: (claimId: string) => storageConfig.pdfs.variants.legacyClaim.replace('<claimId>', claimId),
  claimPdfAI: (claimId: string) => storageConfig.pdfs.variants.aiClaim.replace('<claimId>', claimId),
  proposalPdf: (proposalId: string) => (storageConfig.pdfs.variants.retailProposal || '').replace('<proposalId>', proposalId),
  weatherPdf: (claimId: string) => (storageConfig.pdfs.variants.weatherReport || '').replace('<claimId>', claimId),
  brandingLogo: (orgId: string) => `${storageConfig.branding.basePath}/${orgId}/logo.png`,
  brandingAssetsRoot: (orgId: string) => `${storageConfig.branding.basePath}/${orgId}`,
  claimPhoto: (claimId: string, filename: string) => `${storageConfig.claimAssets.basePath}/${claimId}/photos/${filename}`,
  claimVideo: (claimId: string, filename: string) => `${storageConfig.claimAssets.basePath}/${claimId}/videos/${filename}`,
  tradeLogo: (tradeId: string) => `${storageConfig.trades.basePath}/${tradeId}/logo.png`,
  tradeBrochure: (tradeId: string, filename: string) => `${storageConfig.trades.basePath}/${tradeId}/brochures/${filename}`
};
