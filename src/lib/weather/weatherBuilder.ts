import { logger } from "@/lib/logger";

/**
 * Weather Builder - Weather verification and analysis
 * Stub file for legacy imports
 */

export interface WeatherVerificationResult {
  verified: boolean;
  summary: string;
  events: any[];
}

/**
 * Fetch weather verification
 * @deprecated Use weather AI functions from '@/lib/ai/weather' instead
 */
export async function fetchWeatherVerification(_params: {
  location: string;
  dateOfLoss: Date;
}): Promise<WeatherVerificationResult> {
  logger.warn("fetchWeatherVerification is deprecated - use weather AI functions instead");

  return {
    verified: false,
    summary: "Weather verification not available - please use modern weather module",
    events: [],
  };
}
