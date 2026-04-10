// ============================================================================
// AI ENGINE REGISTRY
// ============================================================================

import { runCodes } from "../engines/codes";
import { runDamageBuilder } from "../engines/damageBuilder";
import { runPhotoGrouping } from "../engines/photoGrouping";
import { runWeather } from "../engines/weather";
import type { AIEngineConfig, AISectionKey, AISectionState } from "../types";

export const AIEngineRegistry: Record<string, AIEngineConfig> = {
  damageBuilder: {
    name: "AI Damage Builder",
    bucket: "mockup",
    tokensPerRun: 10,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runSection: async (reportId: string, sectionKey: AISectionKey, context?: any) => {
      return await runDamageBuilder(reportId, sectionKey, context);
    },
  },
  weather: {
    name: "AI Weather Verification",
    bucket: "weather",
    tokensPerRun: 2,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runSection: async (reportId: string, sectionKey: AISectionKey, context?: any) => {
      return await runWeather(reportId, sectionKey, context);
    },
  },
  codes: {
    name: "AI Code Compliance",
    bucket: "dol",
    tokensPerRun: 5,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runSection: async (reportId: string, sectionKey: AISectionKey, context?: any) => {
      return await runCodes(reportId, sectionKey, context);
    },
  },
  photoGrouping: {
    name: "AI Photo Grouping",
    bucket: "mockup",
    tokensPerRun: 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runSection: async (reportId: string, sectionKey: AISectionKey, context?: any) => {
      return await runPhotoGrouping(reportId, sectionKey, context);
    },
  },
};

/**
 * Get engine by name
 */
export function getEngine(engineName: string): AIEngineConfig | null {
  return AIEngineRegistry[engineName] || null;
}

/**
 * Run specific engine for a section
 */
export async function runEngine(
  engineName: string,
  reportId: string,
  sectionKey: AISectionKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
): Promise<AISectionState> {
  const engine = getEngine(engineName);
  if (!engine) {
    throw new Error(`Unknown AI engine: ${engineName}`);
  }
  return await engine.runSection(reportId, sectionKey, context);
}

/**
 * Run all engines for a report (auto-detect relevant sections)
 */
export async function runAllEngines(
  reportId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
): Promise<Record<AISectionKey, AISectionState>> {
  const results: Record<string, AISectionState> = {};

  // Run each engine for its primary section
  const engineMappings: Array<[string, AISectionKey]> = [
    ["damageBuilder", "scopeMatrix"],
    ["weather", "lossWeather"],
    ["codes", "codes"],
    ["photoGrouping", "photos"],
  ];

  for (const [engineName, sectionKey] of engineMappings) {
    try {
      results[sectionKey] = await runEngine(engineName, reportId, sectionKey, context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      results[sectionKey] = {
        sectionKey,
        status: "failed",
        fields: {},
        error: error.message,
      };
    }
  }

  return results as Record<AISectionKey, AISectionState>;
}
