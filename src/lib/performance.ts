import { logger } from "@/lib/logger";

/**
 * Performance Monitoring Configuration
 * 
 * Cache Strategy:
 * - Dashboard: 60s revalidation (frequently updated data)
 * - Reports Summary: 1 hour revalidation (stable analytics)
 * - Map API: 5 minutes revalidation (semi-static location data)
 * 
 * LCP Optimizations:
 * - PropertyMap: Dynamic import with ssr: false
 * - No blocking images in above-the-fold content
 * - All images use Next.js Image component with optimization
 * 
 * Database Optimization:
 * - Connection pooling via Supabase (port 6543)
 * - Retry logic with exponential backoff
 * - Selective field fetching to reduce payload size
 */

export const CACHE_CONFIG = {
  // API Route Revalidation (seconds)
  DASHBOARD: 60,
  REPORTS_SUMMARY: 3600, // 1 hour
  MAP_DATA: 300, // 5 minutes
  CLAIMS_LIST: 120, // 2 minutes
  LEADS_LIST: 120, // 2 minutes
  
  // Client-side cache (React Query / SWR compatible)
  STALE_TIME: {
    DEFAULT: 60000, // 1 minute
    ANALYTICS: 300000, // 5 minutes
    STATIC_DATA: 3600000, // 1 hour
  },
} as const;

export const PERFORMANCE_TARGETS = {
  // Web Vitals Targets
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100, // First Input Delay (ms)
  CLS: 0.1, // Cumulative Layout Shift
  TTFB: 600, // Time to First Byte (ms)
  
  // Custom Metrics
  API_RESPONSE: 500, // Target API response time (ms)
  QUERY_TIME: 200, // Target database query time (ms)
} as const;

/**
 * Log performance metrics to console in development
 */
export function logPerformanceMetric(
  metric: string,
  value: number,
  threshold: number
) {
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NODE_ENV === 'development') {
    const status = value <= threshold ? '✅' : '⚠️';
    logger.debug(`${status} Performance [${metric}]: ${value}ms (target: ${threshold}ms)`);
  }
}

/**
 * Monitor API response time
 */
export async function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    logPerformanceMetric(operationName, duration, PERFORMANCE_TARGETS.API_RESPONSE);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`❌ Performance [${operationName}]: Failed after ${duration}ms`, error);
    throw error;
  }
}
