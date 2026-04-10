// lib/intel/automation/mapActions.ts
/**
 * 🔥 PHASE 12 - ACTION MAPPING ENGINE
 * 
 * Maps triggers to actions automatically.
 * 
 * When SkaiPDF detects "UNDERPAYMENT_DETECTED" → 
 * It maps to: ["GENERATE_SUPPLEMENT", "SEND_ADJUSTER_EMAIL", "CREATE_TASK"]
 */

import type { TriggerType } from "./detectTriggers";

export type ActionType =
  | "GENERATE_FINANCIAL"
  | "GENERATE_CLAIMS_PACKET"
  | "GENERATE_SUPPLEMENT"
  | "GENERATE_FORENSIC_WEATHER"
  | "GENERATE_SUPER_PACKET_QUICK"
  | "GENERATE_SUPER_PACKET_STANDARD"
  | "GENERATE_SUPER_PACKET_NUCLEAR"
  | "SEND_ADJUSTER_EMAIL"
  | "SEND_HOMEOWNER_EMAIL"
  | "SEND_FOLLOW_UP_EMAIL"
  | "CREATE_TASK"
  | "CREATE_ALERT"
  | "CREATE_RECOMMENDATION"
  | "UPDATE_CLAIM_STATUS"
  | "LOG_ACTIVITY"
  | "ESCALATE_TO_MANAGER";

export interface MappedAction {
  type: ActionType;
  priority: number; // Lower number = higher priority
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any; // Action-specific configuration
}

/**
 * Core mapping table - defines which actions fire for each trigger
 */
export const TRIGGER_ACTION_MAP: Record<TriggerType, MappedAction[]> = {
  // ========================================
  // UNDERPAYMENT DETECTED
  // ========================================
  UNDERPAYMENT_DETECTED: [
    {
      type: "GENERATE_FINANCIAL",
      priority: 1,
      config: { includeDepreciation: true, includeProjections: true },
    },
    {
      type: "GENERATE_SUPPLEMENT",
      priority: 2,
      config: { autoJustify: true },
    },
    {
      type: "CREATE_ALERT",
      priority: 3,
      config: {
        alertType: "UNDERPAYMENT",
        title: "⚠️ Underpayment Detected",
      },
    },
    {
      type: "CREATE_RECOMMENDATION",
      priority: 4,
      config: {
        recommendationType: "SUPPLEMENT_NEEDED",
        actionButton: "Generate Supplement Packet",
      },
    },
    {
      type: "CREATE_TASK",
      priority: 5,
      config: {
        title: "Review Underpayment with Adjuster",
        priority: "HIGH",
        category: "FINANCIAL",
      },
    },
  ],

  // ========================================
  // WEATHER CORRELATION HIGH
  // ========================================
  WEATHER_CORRELATION_HIGH: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "WEATHER_MATCH",
        title: "✅ Weather Event Verified",
      },
    },
    {
      type: "CREATE_RECOMMENDATION",
      priority: 2,
      config: {
        recommendationType: "WEATHER_VERIFIED",
        actionButton: "View Weather Report",
      },
    },
    {
      type: "LOG_ACTIVITY",
      priority: 3,
      config: {
        title: "Weather Correlation Confirmed",
      },
    },
  ],

  // ========================================
  // ADJUSTER OVERDUE
  // ========================================
  ADJUSTER_OVERDUE: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "COMMUNICATION_OVERDUE",
        title: "📨 Adjuster Email Overdue",
      },
    },
    {
      type: "SEND_FOLLOW_UP_EMAIL",
      priority: 2,
      config: {
        audience: "ADJUSTER",
        template: "follow_up_reminder",
      },
    },
    {
      type: "CREATE_TASK",
      priority: 3,
      config: {
        title: "Follow up with Adjuster",
        priority: "HIGH",
        category: "COMMUNICATION",
      },
    },
    {
      type: "UPDATE_CLAIM_STATUS",
      priority: 4,
      config: {
        newStatus: "follow_up_required",
      },
    },
  ],

  // ========================================
  // MISSING ITEMS CRITICAL
  // ========================================
  MISSING_ITEMS_CRITICAL: [
    {
      type: "GENERATE_SUPPLEMENT",
      priority: 1,
      config: { focusOnMissingItems: true },
    },
    {
      type: "CREATE_ALERT",
      priority: 2,
      config: {
        alertType: "MISSING_ITEMS",
        title: "⚠️ Critical Items Missing",
      },
    },
    {
      type: "CREATE_RECOMMENDATION",
      priority: 3,
      config: {
        recommendationType: "SUPPLEMENT_NEEDED",
        actionButton: "Generate Supplement List",
      },
    },
  ],

  // ========================================
  // CLAIM IDLE
  // ========================================
  CLAIM_IDLE: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "CLAIM_STALLED",
        title: "⏰ Claim Idle",
      },
    },
    {
      type: "CREATE_TASK",
      priority: 2,
      config: {
        title: "Check Claim Status",
        priority: "MEDIUM",
        category: "COMMUNICATION",
      },
    },
    {
      type: "GENERATE_FINANCIAL",
      priority: 3,
      config: { refreshData: true },
    },
  ],

  // ========================================
  // SUPPLEMENT OPPORTUNITY
  // ========================================
  SUPPLEMENT_OPPORTUNITY: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "SUPPLEMENT_OPPORTUNITY",
        title: "⚡ Supplement Opportunity",
      },
    },
    {
      type: "GENERATE_SUPPLEMENT",
      priority: 2,
      config: { includePhotos: true },
    },
    {
      type: "CREATE_RECOMMENDATION",
      priority: 3,
      config: {
        recommendationType: "SUPPLEMENT_READY",
        actionButton: "Send Supplement Packet",
      },
    },
  ],

  // ========================================
  // CODE VIOLATION
  // ========================================
  CODE_VIOLATION: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "CODE_VIOLATION",
        title: "⚠️ Code Requirements Not Met",
      },
    },
    {
      type: "GENERATE_CLAIMS_PACKET",
      priority: 2,
      config: { emphasizeCodes: true },
    },
    {
      type: "CREATE_TASK",
      priority: 3,
      config: {
        title: "Document Code Violations",
        priority: "HIGH",
        category: "DAMAGE",
      },
    },
  ],

  // ========================================
  // CAUSATION DISPUTED
  // ========================================
  CAUSATION_DISPUTED: [
    {
      type: "GENERATE_FORENSIC_WEATHER",
      priority: 1,
      config: { legalGrade: true },
    },
    {
      type: "GENERATE_SUPER_PACKET_NUCLEAR",
      priority: 2,
      config: { includeExpertOpinion: true },
    },
    {
      type: "CREATE_ALERT",
      priority: 3,
      config: {
        alertType: "CAUSATION_DISPUTED",
        title: "🔥 NUCLEAR MODE: Causation Disputed",
      },
    },
    {
      type: "CREATE_RECOMMENDATION",
      priority: 4,
      config: {
        recommendationType: "NUCLEAR_PACKET",
        actionButton: "Generate Nuclear Packet",
      },
    },
    {
      type: "CREATE_TASK",
      priority: 5,
      config: {
        title: "Prepare Forensic Defense",
        priority: "CRITICAL",
        category: "WEATHER",
      },
    },
    {
      type: "ESCALATE_TO_MANAGER",
      priority: 6,
      config: { reason: "Causation dispute requires immediate attention" },
    },
  ],

  // ========================================
  // CARRIER DENIAL
  // ========================================
  CARRIER_DENIAL: [
    {
      type: "GENERATE_SUPER_PACKET_NUCLEAR",
      priority: 1,
      config: {},
    },
    {
      type: "CREATE_ALERT",
      priority: 2,
      config: {
        alertType: "CARRIER_DENIAL",
        title: "🚨 CRITICAL: Claim Denied",
      },
    },
    {
      type: "ESCALATE_TO_MANAGER",
      priority: 3,
      config: { reason: "Carrier denied claim" },
    },
  ],

  // ========================================
  // INSPECTION COMPLETED
  // ========================================
  INSPECTION_COMPLETED: [
    {
      type: "GENERATE_FINANCIAL",
      priority: 1,
      config: {},
    },
    {
      type: "LOG_ACTIVITY",
      priority: 2,
      config: { title: "Inspection Completed - Financial Analysis Run" },
    },
  ],

  // ========================================
  // PHOTOS UPLOADED
  // ========================================
  PHOTOS_UPLOADED: [
    {
      type: "LOG_ACTIVITY",
      priority: 1,
      config: { title: "Photos Uploaded" },
    },
  ],

  // ========================================
  // WEATHER EVENT NEARBY
  // ========================================
  WEATHER_EVENT_NEARBY: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "WEATHER_EVENT",
        title: "🌩️ Weather Event Near Property",
      },
    },
  ],

  // ========================================
  // SETTLEMENT READY
  // ========================================
  SETTLEMENT_READY: [
    {
      type: "CREATE_ALERT",
      priority: 1,
      config: {
        alertType: "SETTLEMENT_READY",
        title: "✅ Claim Ready for Settlement",
      },
    },
    {
      type: "UPDATE_CLAIM_STATUS",
      priority: 2,
      config: { newStatus: "settlement_ready" },
    },
  ],
};

/**
 * Get actions for a trigger type
 */
export function getActionsForTrigger(triggerType: TriggerType): MappedAction[] {
  return TRIGGER_ACTION_MAP[triggerType] || [];
}

/**
 * Get all actions sorted by priority
 */
export function getSortedActions(triggerType: TriggerType): MappedAction[] {
  const actions = getActionsForTrigger(triggerType);
  return actions.sort((a, b) => a.priority - b.priority);
}
