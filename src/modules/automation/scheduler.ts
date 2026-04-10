import { getAgentQueue } from "@/lib/agent/queues";

/**
 * Phase 6: Agent Mission Scheduler
 * Sets up recurring cron jobs for autonomous missions
 */

export async function scheduleRecurringMissions() {
  const { queue } = getAgentQueue();

  // Sequencer runs every 5 minutes
  await queue.add(
    "sequencer-tick",
    { agentId: "SEQUENCER" },
    { repeat: { every: 5 * 60 * 1000 }, jobId: "recur:sequencer" }
  );

  // Auto depreciation check every 3 hours
  await queue.add(
    "depreciation-check",
    { agentId: "AUTO_DEPRECIATION" },
    { repeat: { every: 3 * 60 * 60 * 1000 }, jobId: "recur:auto_depr" }
  );

  // eslint-disable-next-line no-console
  console.log("✅ Recurring agent jobs scheduled");
}
