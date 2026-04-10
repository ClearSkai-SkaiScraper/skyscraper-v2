/**
 * AI CORE ROUTER
 *
 * Universal AI task routing system with manual module registration.
 * Provides unified access to all AI modules with proper ES module support.
 *
 * Task format: "module.function" (e.g., "damage.analyze", "claims.compose")
 */

// Import logging utilities
// Static imports for all AI modules (fixes Next.js ES module issue)
import { logger } from "@/lib/observability/logger";

import * as aiAssistant from "./aiAssistant";
import * as automation from "./automation";
import * as autoTimeline from "./autoTimeline";
import * as callGPT4 from "./callGPT4";
import * as captionRules from "./captionRules";
import * as carrierComplianceEngine from "./carrierComplianceEngine";
import * as carrierDetect from "./carrierDetect";
import * as claimMemory from "./claimMemory";
import * as claimWriter from "./claimWriter";
import * as classifyDocument from "./classifyDocument";
import * as client from "./client";
import * as composeClaim from "./composeClaim";
import * as coreRouter from "./core-router";
import * as costEstimation from "./costEstimation";
import * as damage from "./damage";
import * as damageSchema from "./damage-schema";
import * as damageBuilder from "./damageBuilder";
import * as documentProcessing from "./documentProcessing";
import * as skaiVideo from "./dominusVideo";
import * as embeddings from "./embeddings";
import * as estimates from "./estimates";
import * as estimatorEngine from "./estimatorEngine";
import * as jsonSanitizer from "./jsonSanitizer";
import * as lineItemsGenerator from "./line-items-generator";
import { logError, logSuccess } from "./logger";
import * as messageAssistant from "./messageAssistant";
import * as openaiVision from "./openai-vision";
import * as photoAnnotator from "./photo-annotator";
import * as photoCaptionGenerator from "./photo-caption-generator";
import * as pricing from "./pricing";
import * as promptDamageBuilder from "./promptDamageBuilder";
import * as reportGenerator from "./report-generator";
import * as reports from "./reports";
import * as scopes from "./scopes";
import * as severityScoring from "./severity-scoring";
import * as skillsRegistry from "./skills-registry";
import * as supplementBuilder from "./supplementBuilder";
import * as supplements from "./supplements";
import * as weather from "./weather";
import * as weatherVerification from "./weather-verification";
import * as workflowAutomation from "./workflowAutomation";
// structure-analyzer archived
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const structureAnalyzer = { analyzeStructure: async (..._args: any[]) => ({ ok: true, data: {} }) };

/**
 * AI Task Registry
 * Maps task names to their handler functions
 */
const registry: Record<string, Function> = {};

/**
 * Module metadata for introspection
 */
interface ModuleInfo {
  name: string;
  tasks: string[];
  filepath: string;
  registered: boolean;
}

const moduleIndex: Map<string, ModuleInfo> = new Map();

/**
 * Manually register all AI modules
 *
 * Replaces dynamic require() with static imports for Next.js compatibility
 */
function registerModules() {
  const modules = {
    aiAssistant,
    autoTimeline,
    automation,
    callGPT4,
    captionRules,
    carrierComplianceEngine,
    carrierDetect,
    claimMemory,
    claimWriter,
    classifyDocument,
    client,
    composeClaim,
    coreRouter,
    costEstimation,
    damageSchema,
    damage,
    damageBuilder,
    documentProcessing,
    skaiVideo,
    embeddings,
    estimates,
    estimatorEngine,
    jsonSanitizer,
    lineItemsGenerator,
    logger,
    messageAssistant,
    openaiVision,
    photoAnnotator,
    photoCaptionGenerator,
    pricing,
    promptDamageBuilder,
    reportGenerator,
    reports,
    scopes,
    severityScoring,
    skillsRegistry,
    structureAnalyzer,
    supplementBuilder,
    supplements,
    weather,
    weatherVerification,
    workflowAutomation,
  };

  logger.debug(`[AI Router] Registering ${Object.keys(modules).length} modules`);

  for (const [moduleName, moduleExports] of Object.entries(modules)) {
    try {
      const tasks: string[] = [];

      // Register all exported functions
      for (const exportName in moduleExports) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handler = (moduleExports as any)[exportName];

        if (typeof handler === "function") {
          // Build task name: "moduleName.functionName"
          const taskName = `${moduleName}.${exportName}`;

          registry[taskName] = handler;
          tasks.push(taskName);
        }
      }

      // Store module metadata
      moduleIndex.set(moduleName, {
        name: moduleName,
        tasks,
        filepath: `src/lib/ai/${moduleName}.ts`,
        registered: tasks.length > 0,
      });

      if (tasks.length > 0) {
        logger.debug(`[AI Router] ✓ ${moduleName}: ${tasks.length} tasks`);
      } else {
        logger.warn(`[AI Router] ⚠ ${moduleName}: no exported functions found`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error(`[AI_ROUTER] Failed to register ${moduleName}: ${err?.message ?? err}`);

      // Still register module as failed
      moduleIndex.set(moduleName, {
        name: moduleName,
        tasks: [],
        filepath: `src/lib/ai/${moduleName}.ts`,
        registered: false,
      });
    }
  }

  logger.debug(`[AI Router] Total tasks registered: ${Object.keys(registry).length}`);
}

// Initialize registry on module load
try {
  registerModules();
} catch (err) {
  logger.error("[AI Router] Failed to initialize:", err);
}

/**
 * Standard AI response format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AIResponse<T = any> {
  success: boolean;
  task?: string;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    module: string;
    handler: string;
    executionTime?: number;
  };
  availableTasks?: string[];
  stack?: string;
}

/**
 * Universal AI Core Router
 *
 * Routes any AI task to the appropriate module handler.
 * Returns standardized response format.
 *
 * @param task - Task name in format "module.function"
 * @param payload - Task-specific input data
 * @returns Promise<AIResponse>
 *
 * @example
 * await AICoreRouter("video.analyze", { file: videoBuffer })
 * await AICoreRouter("3d.detectObjects", { images: [...] })
 * await AICoreRouter("agents.optimizePolicy", { state, actions })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function AICoreRouter<T = any>(
  task: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any = {}
): Promise<AIResponse<T>> {
  const startTime = Date.now();

  // Validate task exists
  if (!registry[task]) {
    return {
      success: false,
      error: `Unknown AI task '${task}'. Task not found in registry.`,
      availableTasks: Object.keys(registry).sort(),
      meta: {
        timestamp: new Date().toISOString(),
        module: "router",
        handler: "error",
      },
    };
  }

  // Extract module and handler names
  const [moduleName, handlerName] = task.split(".");

  try {
    // Execute task handler
    const result = await registry[task](payload);
    const executionTime = Date.now() - startTime;

    // Log successful execution
    logSuccess(task, payload, result, executionTime, {
      claimId: payload?.claimId,
      userId: payload?.userId,
    });

    return {
      success: true,
      task,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        module: moduleName,
        handler: handlerName,
        executionTime,
      },
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const executionTime = Date.now() - startTime;

    logger.error(`[AI Router] Task '${task}' failed:`, err);

    // Log error
    logError(task, payload, err.message, executionTime, {
      claimId: payload?.claimId,
      userId: payload?.userId,
    });

    return {
      success: false,
      task,
      error: err.message || "Unknown AI error",
      // eslint-disable-next-line no-restricted-syntax
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      meta: {
        timestamp: new Date().toISOString(),
        module: moduleName,
        handler: handlerName,
        executionTime,
      },
    };
  }
}

/**
 * List all available AI tasks
 *
 * @returns Array of task names in "module.function" format
 */
export function listAITasks(): string[] {
  return Object.keys(registry).sort();
}

/**
 * List all registered modules
 *
 * @returns Array of module metadata
 */
export function listAIModules(): ModuleInfo[] {
  return Array.from(moduleIndex.values());
}

/**
 * Get tasks for a specific module
 *
 * @param moduleName - Name of the module
 * @returns Array of task names or empty array if module not found
 */
export function getModuleTasks(moduleName: string): string[] {
  const moduleEntry = moduleIndex.get(moduleName);
  return moduleEntry?.tasks || [];
}

/**
 * Check if a task is registered
 *
 * @param task - Task name in format "module.function"
 * @returns boolean
 */
export function isTaskAvailable(task: string): boolean {
  return task in registry;
}

/**
 * Manually register a task (for runtime additions)
 *
 * @param task - Task name in format "module.function"
 * @param handler - Function to handle the task
 */
export function registerTask(task: string, handler: Function): void {
  if (registry[task]) {
    logger.warn(`[AI Router] Task '${task}' already registered. Overwriting.`);
  }

  registry[task] = handler;
  logger.debug(`[AI Router] Manually registered: ${task}`);
}

/**
 * Get registry statistics
 */
export function getRegistryStats() {
  const modules = Array.from(moduleIndex.values());
  const registered = modules.filter((m) => m.registered).length;
  const failed = modules.filter((m) => !m.registered).length;

  return {
    totalModules: modules.length,
    registeredModules: registered,
    failedModules: failed,
    totalTasks: Object.keys(registry).length,
    modules: modules.map((m) => ({
      name: m.name,
      taskCount: m.tasks.length,
      registered: m.registered,
    })),
  };
}

// Export types for external use
export type { AIResponse, ModuleInfo };
