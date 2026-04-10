export interface AutomationEvent {
  type:
    | "AGENT.RUN"
    | "AGENT.SUCCESS"
    | "AGENT.FAIL"
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
  actor: "AI" | "USER" | "SYSTEM";
  message: string;
  orgId?: string;
  jobId?: string;
  missionId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  createdAt: string;
}
