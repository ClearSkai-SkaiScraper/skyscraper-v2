/**
 * AI Claims Lifecycle Hooks
 *
 * Automatically trigger AI analysis at key claim lifecycle events:
 * - onClaimCreated: Initial triage and categorization
 * - onPhotosChanged: Damage assessment and 3D reconstruction
 * - onVideoUploaded: Video analysis for motion and objects
 * - onBlueprintAdded: Floor plan analysis and spatial understanding
 * - onStatusChanged: Policy optimization and workflow coordination
 *
 * All AI results are stored in claim.aiMetadata for audit and retrieval.
 */

import { AICoreRouter } from "@/lib/ai/router";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface AIResult {
  task: string;
  output: any;
  confidence: number;
  executionTime: number;
  timestamp: string;
}

interface ClaimAIMetadata {
  triage?: AIResult;
  damageAssessment?: AIResult;
  videoAnalysis?: AIResult;
  blueprintAnalysis?: AIResult;
  policyOptimization?: AIResult;
  history: AIResult[];
}

/**
 * Store AI result in claim metadata
 * Note: Storing in claim_analysis table since claims doesn't have aiMetadata field
 */
async function storeAIResult(claimId: string, result: AIResult) {
  // Store in claim_analysis table
  await prisma.claim_analysis.upsert({
    where: { claim_id: claimId },
    update: {
      summary: JSON.stringify(result),
    },
    create: {
      id: `analysis-${claimId}`,
      claim_id: claimId,
      summary: JSON.stringify(result),
      created_at: new Date(),
    },
  });

  // Log activity (using NOTE type since AI_ANALYSIS_COMPLETED doesn't exist in enum)
  // Note: claim_activities requires user_id, so we use a system user ID
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: "system",
      type: "NOTE",
      message: JSON.stringify({
        task: result.task,
        confidence: result.confidence,
        executionTime: result.executionTime,
        source: "AI_ANALYSIS",
      }),
      created_at: new Date(),
    },
  });

  return { history: [result] };
}

/**
 * Hook: Claim Created
 *
 * Triggers initial triage and categorization:
 * - Analyze claim description for damage type
 * - Estimate complexity and required resources
 * - Suggest optimal workflow path
 */
export async function onClaimCreated(claimId: string) {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        title: true,
        description: true,
        damageType: true,
        estimatedValue: true,
      },
    });

    if (!claim) return;

    const startTime = Date.now();

    // Run triage analysis
    const result = await AICoreRouter("classification.triageClaim", {
      title: claim.title,
      description: claim.description,
      damageType: claim.damageType,
      estimatedAmount: claim.estimatedValue,
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      await storeAIResult(claimId, {
        task: "classification.triageClaim",
        output: result.data,
        confidence: result.data?.confidence || 0.85,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`[AI Hook] Claim triage completed for ${claimId} in ${executionTime}ms`);
    }

    return result;
  } catch (error) {
    logger.error(`[AI Hook] Claim triage failed for ${claimId}:`, error);
    return null;
  }
}

/**
 * Hook: Photos Changed
 *
 * Triggers damage assessment and 3D reconstruction:
 * - Detect objects and damage in photos
 * - Estimate damage extent and severity
 * - Generate 3D reconstruction if multiple angles available
 */
export async function onPhotosChanged(claimId: string, photoUrls: string[]) {
  try {
    if (photoUrls.length === 0) return;

    const startTime = Date.now();

    // Run 3D damage assessment
    const result = await AICoreRouter("3d.detectObjects", {
      images: photoUrls,
      claimId,
      options: {
        detectDamage: true,
        estimate3D: photoUrls.length >= 3,
        measureExtent: true,
      },
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      await storeAIResult(claimId, {
        task: "3d.detectObjects",
        output: result.data,
        confidence: result.data?.confidence || 0.8,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `[AI Hook] Damage assessment completed for ${claimId}: ${photoUrls.length} photos in ${executionTime}ms`
      );
    }

    return result;
  } catch (error) {
    logger.error(`[AI Hook] Damage assessment failed for ${claimId}:`, error);
    return null;
  }
}

/**
 * Hook: Video Uploaded
 *
 * Triggers video analysis:
 * - Detect motion and activity
 * - Classify scenes and events
 * - Extract key frames for further analysis
 */
export async function onVideoUploaded(claimId: string, videoUrl: string) {
  try {
    const startTime = Date.now();

    // Run video analysis
    const result = await AICoreRouter("video.analyze", {
      url: videoUrl,
      claimId,
      options: {
        detectMotion: true,
        classifyScenes: true,
        extractKeyframes: true,
        trackObjects: true,
      },
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      await storeAIResult(claimId, {
        task: "video.analyze",
        output: result.data,
        confidence: result.data?.confidence || 0.82,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`[AI Hook] Video analysis completed for ${claimId} in ${executionTime}ms`);

      // If keyframes were extracted, run damage assessment on them
      if (result.data?.keyframes?.length > 0) {
        await onPhotosChanged(claimId, result.data.keyframes);
      }
    }

    return result;
  } catch (error) {
    logger.error(`[AI Hook] Video analysis failed for ${claimId}:`, error);
    return null;
  }
}

/**
 * Hook: Blueprint Added
 *
 * Triggers floor plan analysis:
 * - Parse blueprint and extract spatial information
 * - Identify rooms and measurements
 * - Generate 3D model from 2D plans
 */
export async function onBlueprintAdded(claimId: string, blueprintUrl: string) {
  try {
    const startTime = Date.now();

    // Run blueprint analysis
    const result = await AICoreRouter("semantic.analyzeBlueprint", {
      url: blueprintUrl,
      claimId,
      options: {
        extractRooms: true,
        detectMeasurements: true,
        generate3D: true,
      },
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      await storeAIResult(claimId, {
        task: "semantic.analyzeBlueprint",
        output: result.data,
        confidence: result.data?.confidence || 0.87,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`[AI Hook] Blueprint analysis completed for ${claimId} in ${executionTime}ms`);
    }

    return result;
  } catch (error) {
    logger.error(`[AI Hook] Blueprint analysis failed for ${claimId}:`, error);
    return null;
  }
}

/**
 * Hook: Status Changed
 *
 * Triggers policy optimization and workflow coordination:
 * - Analyze current claim state and context
 * - Optimize next-best actions
 * - Coordinate multi-agent workflow
 */
export async function onStatusChanged(claimId: string, oldStatus: string, newStatus: string) {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        title: true,
        damageType: true,
        lifecycle_stage: true,
      },
    });

    if (!claim) return;

    const startTime = Date.now();

    // Run policy optimization
    const result = await AICoreRouter("multi-agent.optimizePolicy", {
      claimId,
      context: {
        oldStatus,
        newStatus,
        lifecycleStage: claim.lifecycle_stage,
        damageType: claim.damageType,
      },
      goals: ["minimize_processing_time", "maximize_accuracy", "optimize_resource_allocation"],
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      await storeAIResult(claimId, {
        task: "multi-agent.optimizePolicy",
        output: result.data,
        confidence: result.data?.confidence || 0.78,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `[AI Hook] Policy optimization completed for ${claimId}: ${oldStatus} → ${newStatus} in ${executionTime}ms`
      );
    }

    return result;
  } catch (error) {
    logger.error(`[AI Hook] Policy optimization failed for ${claimId}:`, error);
    return null;
  }
}

/**
 * Get all AI analysis results for a claim
 */
export async function getClaimAIAnalysis(claimId: string): Promise<ClaimAIMetadata | null> {
  try {
    const analysis = await prisma.claim_analysis.findUnique({
      where: { claim_id: claimId },
    });

    if (!analysis) return null;

    // Parse from summary field where we store the JSON
    if (analysis.summary) {
      try {
        return JSON.parse(analysis.summary) as ClaimAIMetadata;
      } catch {
        return null;
      }
    }
    return null;
  } catch (error) {
    logger.error(`[AI Hook] Failed to get AI analysis for ${claimId}:`, error);
    return null;
  }
}

/**
 * Manually trigger AI analysis for a claim
 */
export async function triggerManualAnalysis(
  claimId: string,
  analysisType: "triage" | "damage" | "video" | "blueprint" | "policy"
) {
  switch (analysisType) {
    case "triage":
      return onClaimCreated(claimId);
    case "damage":
      const photos = await prisma.file_assets.findMany({
        where: { claimId, mimeType: { startsWith: "image/" } },
      });
      const photoUrls = photos.map((p) => p.publicUrl).filter(Boolean) as string[];
      return onPhotosChanged(claimId, photoUrls);
    case "video":
      const videos = await prisma.file_assets.findMany({
        where: { claimId, mimeType: { startsWith: "video/" } },
      });
      const videoUrl = videos[0]?.publicUrl;
      return videoUrl ? onVideoUploaded(claimId, videoUrl) : null;
    case "blueprint":
      const blueprints = await prisma.file_assets.findMany({
        where: {
          claimId,
          OR: [{ mimeType: "application/pdf" }, { filename: { contains: "blueprint" } }],
        },
      });
      const blueprintUrl = blueprints[0]?.publicUrl;
      return blueprintUrl ? onBlueprintAdded(claimId, blueprintUrl) : null;
    case "policy":
      const policyClaim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: { status: true },
      });
      return onStatusChanged(claimId, policyClaim?.status || "new", policyClaim?.status || "new");
    default:
      return null;
  }
}
