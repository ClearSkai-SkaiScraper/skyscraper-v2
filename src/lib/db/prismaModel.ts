// src/lib/prismaModel.ts
import prisma from "@/lib/prisma";

// Delegate keys that ACTUALLY exist on your Prisma client (from your list)
export const PRISMA_MODELS = {
  activities: true,
  ai_reports: true,
  billingSettings: true,
  claims: true,
  contacts: true,
  documents: true,
  estimates: true,
  fileAsset: true,
  inspections: true,
  jobs: true,
  leads: true,
  org: true,
  org_branding: true,
  plan: true,
  projects: true,
  properties: true,
  proposal_drafts: true,
  proposal_files: true,
  quick_dols: true,
  subscription: true,
  tasks: true,
  tool_usage: true,
  user_organizations: true,
  users: true,
  weather_daily_snapshots: true,
  weather_documents: true,
  weather_events: true,
  webhookEvent: true,
} as const;

export type PrismaModelKey = keyof typeof PRISMA_MODELS;

// Helper: returns a *typed* delegate when it exists, else null
export function prismaModel<K extends PrismaModelKey>(key: K): any {
  return (prisma as any)[key];
}

// Helper: allows “maybe model” usage for legacy model names (string input)
// Use this ONLY when you’re trying to gracefully degrade features.
export function prismaMaybeModel(key: string): any | null {
  return (prisma as any)[key] ?? null;
}
