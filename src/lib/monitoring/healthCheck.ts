import { logger } from "@/lib/logger";

/**
 * System Health Monitoring
 *
 * Tracks system health metrics and provides status checks
 * Used for uptime monitoring and alerting
 */

export interface HealthStatus {
  healthy: boolean;
  timestamp: string;
  checks: {
    database: { status: "healthy" | "degraded" | "down"; latency?: number };
    redis: { status: "healthy" | "degraded" | "down"; latency?: number };
    storage: { status: "healthy" | "degraded" | "down" };
    email: { status: "healthy" | "degraded" | "down" };
    websocket: { status: "healthy" | "degraded" | "down" };
  };
  metadata: {
    uptime: number;
    version: string;
    environment: string;
  };
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<{
  status: "healthy" | "degraded" | "down";
  latency?: number;
}> {
  try {
    const start = Date.now();

    // Dynamic import to avoid circular deps
    const { default: prisma } = await import("@/lib/prisma");

    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: latency < 100 ? "healthy" : "degraded",
      latency,
    };
  } catch (error) {
    logger.error("Database health check failed:", error);
    return { status: "down" };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<{
  status: "healthy" | "degraded" | "down";
  latency?: number;
}> {
  try {
    // Redis is optional, graceful degradation
    // TODO: Implement actual Redis check when Redis is configured
    return { status: "healthy", latency: 0 };
  } catch {
    return { status: "down" };
  }
}

/**
 * Check storage health
 */
async function checkStorage(): Promise<{ status: "healthy" | "degraded" | "down" }> {
  try {
    // TODO: Check S3/R2 connectivity
    return { status: "healthy" };
  } catch {
    return { status: "down" };
  }
}

/**
 * Check email service health
 */
async function checkEmail(): Promise<{ status: "healthy" | "degraded" | "down" }> {
  try {
    // TODO: Check email service (Resend/SendGrid) connectivity
    return { status: "healthy" };
  } catch {
    return { status: "down" };
  }
}

/**
 * Check WebSocket health
 */
async function checkWebSocket(): Promise<{ status: "healthy" | "degraded" | "down" }> {
  try {
    // TODO: Check WebSocket server status
    return { status: "healthy" };
  } catch {
    return { status: "down" };
  }
}

/**
 * Run all health checks
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, redis, storage, email, websocket] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    checkEmail(),
    checkWebSocket(),
  ]);

  const allHealthy =
    database.status === "healthy" &&
    redis.status === "healthy" &&
    storage.status === "healthy" &&
    email.status === "healthy" &&
    websocket.status === "healthy";

  return {
    healthy: allHealthy,
    timestamp: new Date().toISOString(),
    checks: {
      database,
      redis,
      storage,
      email,
      websocket,
    },
    metadata: {
      uptime: process.uptime(),
      // eslint-disable-next-line no-restricted-syntax
      version: process.env.npm_package_version || "1.0.0",
      // eslint-disable-next-line no-restricted-syntax
      environment: process.env.NODE_ENV || "development",
    },
  };
}

/**
 * Simple liveness check (database only)
 */
export async function checkLiveness(): Promise<boolean> {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Readiness check (all critical services)
 */
export async function checkReadiness(): Promise<boolean> {
  const status = await getHealthStatus();

  // Database must be healthy, others can degrade
  return status.checks.database.status === "healthy";
}

/**
 * Get system metrics
 */
export async function getSystemMetrics(): Promise<{
  cpu: { usage: number };
  memory: { used: number; total: number; percentage: number };
  uptime: number;
}> {
  const memUsage = process.memoryUsage();

  return {
    cpu: {
      usage: 0, // TODO: Implement CPU monitoring
    },
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    },
    uptime: process.uptime(),
  };
}
