// Mapping deprecated camelCase model names to actual Prisma client delegates (snake_case or mapped)
import prisma from "@/lib/prisma";

const aliasMap: Record<string, keyof typeof prisma> = {
  // carrierDelivery: 'carrier_deliveries',
  // finalizationStatus: 'finalization_statuses',
  // stormEvent: 'storm_events',
  // contractorForm: 'contractor_forms',
  // claimTimelineEvent: 'claim_timeline_events',
  completionPhoto: "completion_photos",
  // damageAssessment: 'damage_assessments',
  // propertyImpact: 'property_impacts',
  reportRecord: "reports",
  // webhooks: 'webhooks',
  // automationAction: 'automation_actions',
  // automationTrigger: 'automation_triggers',
  // automationTask: 'automation_tasks',
  // depreciationItem: 'depreciation_items',
  // ocrRecord: 'ocr_records',
  // // Storage & report history (Wave 6 normalization)
  // fileAssets: 'file_assets',
  // reportHistory: 'report_history',
  // stormRecord: 'storm_events',
  // exportJob: 'export_jobs',
  // automationAlert: 'automation_alerts',
  // automationRecommendation: 'automation_recommendations',
  // // Wave 3 additions (+ Wave 6 camelCase duplicate for compatibility)
  // FileAsset: 'file_assets', // legacy passthrough
  // ClaimPhotoMeta: 'ClaimPhotoMeta', // legacy usage in photoMetaActions
  // claimPhotoMeta: 'ClaimPhotoMeta', // new preferred alias
  // webhook_logs: 'webhook_logs',
  // // Wave 4 property + maintenance domain
  // propertyAnnualReport: 'property_annual_reports',
  // propertyHealthScore: 'property_health_scores',
  // propertyInspection: 'property_inspections',
  // propertyDigitalTwin: 'property_digital_twins',
  // maintenanceSchedule: 'maintenance_schedules',
  // maintenanceTask: 'maintenance_tasks',
  // maintenanceVendor: 'maintenance_vendors',
  // // Wave 5 additions
  // lenderProfile: 'lender_profiles',
  // materialForensicReport: 'material_forensic_reports',
  // carrierApproval: 'carrier_approvals',
  // supplementItem: 'supplement_items',
  // completionDocument: 'completion_documents',
  // teamMember: 'team_members',
  // tokenPack: 'token_packs',
  // supplementRequest: 'supplement_requests',
};

// Temporary compatibility shim: return loosely typed any delegate to suppress union typing issues
export function getDelegate(name: string): any {
  const key = aliasMap[name];
  if (!key) throw new Error(`Model alias not found: ${name}`);
  return (prisma as any)[key];
}

export const deprecatedAliases = Object.keys(aliasMap);
