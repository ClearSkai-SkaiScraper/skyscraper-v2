// lib/intel/automation/executors/alerts.ts
/**
 * 🔥 ALERT & RECOMMENDATION ENGINE
 * Creates intelligent alerts and AI recommendations
 */

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

export async function executeCreateAlert(
  claimId: string,
  orgId: string,
  config: {
    alertType: string;
    title: string;
    message?: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
  }
) {
  logger.debug(`[SKAI] Creating alert: ${config.title}`);

  const alert = await getDelegate("automationAlert").create({
    data: {
      orgId,
      claimId,
      title: config.title,
      message: config.message || config.title,
      severity: config.severity,
    },
  });

  return {
    alertId: alert.id,
    title: alert.title,
  };
}

export async function executeCreateRecommendation(
  claimId: string,
  orgId: string,
  config: {
    recommendationType: string;
    title?: string;
    description?: string;
    actionButton?: string;
    actionEndpoint?: string;
    confidence?: number;
    priority?: string;
    reasoning?: string;
  }
) {
  logger.debug(`[SKAI] Creating recommendation: ${config.recommendationType}`);

  const recommendation = await getDelegate("automationRecommendation").create({
    data: {
      orgId,
      claimId,
      type: config.recommendationType,
      title: config.title || config.recommendationType,
      description: config.description || "",
      confidence: config.confidence || 0.85,
    },
  });

  return {
    recommendationId: recommendation.id,
    title: recommendation.title,
  };
}
