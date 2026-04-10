// ============================================================================
// AI MODULE - TYPE DEFINITIONS
// ============================================================================

export type AISectionKey =
  | "cover"
  | "toc"
  | "exec"
  | "lossWeather"
  | "adjusterNotes"
  | "photos"
  | "tests"
  | "scopeMatrix"
  | "codes"
  | "pricing"
  | "supplements"
  | "signature"
  | "attachments";

export type AIGenerationStatus = "idle" | "running" | "succeeded" | "failed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AIField<T = any> {
  value: T;
  aiGenerated: boolean;
  approved: boolean;
  source?: string; // e.g., 'damageBuilder', 'weather', 'codes'
  confidence?: number; // 0-1
  generatedAt?: string;
}

export interface AISectionState {
  sectionKey: AISectionKey;
  status: AIGenerationStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, AIField<any>>;
  error?: string;
  updatedAt?: string;
}

export type AITokenBucket = "mockup" | "dol" | "weather";

export interface AIJob {
  id: string;
  reportId: string;
  sectionKey?: AISectionKey;
  engine: string;
  status: AIGenerationStatus;
  error?: string;
  result?: AISectionState;
  createdAt: string;
  completedAt?: string;
}

export interface AIUsage {
  id: string;
  userId: string;
  orgId: string;
  bucket: AITokenBucket;
  tokensUsed: number;
  reason: string;
  createdAt: string;
}

export interface AIUsageSummary {
  mockup: { used: number; limit: number; remaining: number };
  dol: { used: number; limit: number; remaining: number };
  weather: { used: number; limit: number; remaining: number };
}

export interface AIEngineConfig {
  name: string;
  bucket: AITokenBucket;
  tokensPerRun: number;
  runSection: (
    reportId: string,
    sectionKey: AISectionKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: any
  ) => Promise<AISectionState>;
}

export interface AIRunRequest {
  reportId: string;
  engine: "damageBuilder" | "weather" | "codes" | "photoGrouping" | "all";
  sections?: AISectionKey[] | "auto";
  bucketHint?: AITokenBucket;
}

export interface AIRunResponse {
  jobIds: string[];
  status: "queued" | "running" | "succeeded" | "failed";
}

export interface AIApproveRequest {
  sectionKey: AISectionKey;
  fields?: string[]; // If omitted, approve entire section
}

export interface AIRejectRequest {
  sectionKey: AISectionKey;
  fields?: string[]; // If omitted, reject entire section
}
