export type MissionId =
  | "AUTO_SUPPLEMENT"
  | "AUTO_DEPRECIATION"
  | "AUTO_APPEAL";

export interface AgentMission {
  id: MissionId;
  title: string;
  description: string;
  runOnInit?: boolean; // run on job creation
  cron?: string; // cron schedule, optional
  requiresApproval?: boolean; // Phase 6: inline processor support
  preconditions(jobId: string): Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(jobId: string, payload?: any): Promise<AgentResult>;
}

export interface AgentResult {
  success: boolean;
  message: string;
  next?: MissionId | null; // chained missions
  requiresApproval?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface AgentTask {
  id: string;
  missionId: MissionId;
  jobId: string;
  status:
    | "QUEUED"
    | "RUNNING"
    | "FAILED"
    | "SUCCESS"
    | "AWAITING_APPROVAL";
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentEvent {
  type:
    | "MISSION.QUEUED"
    | "MISSION.START"
    | "MISSION.SUCCESS"
    | "MISSION.FAIL"
    | "TASK.START"
    | "TASK.SUCCESS"
    | "TASK.FAIL"
    | "AI.WAITING_APPROVAL"
    | "AGENT.RETRY"
    | "AGENT.CHAIN"
    | "SYSTEM.HEALTH";
  jobId: string;
  missionId?: MissionId;
  actor: "AI" | "USER" | "SYSTEM";
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  createdAt: Date;
}
