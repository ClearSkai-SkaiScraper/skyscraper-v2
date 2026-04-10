/**
 * AI Intelligence Core - Type Definitions
 *
 * Core types for the AIMA-inspired intelligent agent system.
 * These types power the orchestration, planning, and learning systems.
 */

export type ClaimStateEnum =
  | "INTAKE"
  | "INSPECTED"
  | "ESTIMATE_DRAFTED"
  | "SUBMITTED"
  | "NEGOTIATING"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "COMPLETE"
  | "PAID";

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  goal: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  utilityModel: any; // JSON structure defining utility calculation
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: any; // Condition DSL (e.g., { all: [{ path: "roof.slope", op: ">", value: 4 }] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any; // Effect definition (add lineItem, flag risk, etc.)
  enabled?: boolean;
}

export interface NextActionSuggestion {
  id: string;
  label: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  agentId?: string;
  actionType: string;
  estimatedTime?: string; // e.g., "5-10 minutes"
  requiredData?: string[]; // What data is needed to perform this action
}

export interface ExplanationPayload {
  reasoning: string;
  rulesUsed?: string[];
  similarCases?: { claimId: string; score: number }[];
  confidenceScore?: number;
}

export interface NegotiationSuggestion {
  summary: string;
  steps: string[];
  expectedImpact?: string;
  tactics?: string[];
  riskLevel?: "low" | "medium" | "high";
}

export interface ClaimIntelligence {
  approvalLikelihood: number; // 0-1
  supplementSuccessProbability: number; // 0-1
  riskScore: number; // 0-1
  recommendedStrategy: string;
  keyFactors: string[];
  warnings?: string[];
}

export interface KnowledgeNodeData {
  id: string;
  type: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export interface KnowledgeEdgeData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export interface ClaimContext {
  claimId: string;
  orgId?: string;
  carrier?: string;
  state?: ClaimStateEnum;
  roofType?: string;
  roofSlope?: number;
  damageTypes?: string[];
  hasPhotos?: boolean;
  hasWeatherData?: boolean;
  estimateValue?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow flexible context
}

export interface UtilityContext {
  claimId: string;
  metrics: Record<string, number>; // e.g., { approvalRate: 0.8, cycleTimeDays: 12 }
  carrier?: string;
  estimateValue?: number;
}

export interface AIActionLog {
  id: string;
  claimId: string;
  agentId: string;
  actionType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputData: any;
  createdAt: Date;
}

export interface AIOutcomeLog {
  id: string;
  actionId: string;
  resultType: string; // approved, partial, denied, delayed, disputed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  createdAt: Date;
}

export interface HumanEditLog {
  id: string;
  actionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalOutput: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editedOutput: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diff: any;
  createdAt: Date;
}
