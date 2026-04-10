/**
 * TASK 117: API VERSIONING
 *
 * API version management, deprecation, and backward compatibility.
 */

export type APIVersion = "1.0" | "1.1" | "2.0" | "2.1" | "3.0";

export interface VersionedEndpoint {
  path: string;
  version: APIVersion;
  handler: (req: any, res: any) => Promise<any>;
  deprecated?: boolean;
  deprecationDate?: Date;
  sunset?: Date;
}

export interface VersionConfig {
  version: APIVersion;
  supported: boolean;
  deprecated: boolean;
  sunsetDate?: Date;
  features: string[];
}

/**
 * API versioning registry
 */
export class APIVersionRegistry {
  private endpoints: Map<string, VersionedEndpoint[]> = new Map();
  private versions: Map<APIVersion, VersionConfig> = new Map();

  /**
   * Register endpoint
   */
  register(endpoint: VersionedEndpoint): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const key = `${endpoint.path}:${endpoint.version}`;
    const existing = this.endpoints.get(endpoint.path) || [];
    existing.push(endpoint);
    this.endpoints.set(endpoint.path, existing);
  }

  /**
   * Get endpoint by version
   */
  getEndpoint(path: string, version: APIVersion): VersionedEndpoint | null {
    const endpoints = this.endpoints.get(path);
    if (!endpoints) return null;

    return endpoints.find((e) => e.version === version) || null;
  }

  /**
   * Get latest version of endpoint
   */
  getLatestEndpoint(path: string): VersionedEndpoint | null {
    const endpoints = this.endpoints.get(path);
    if (!endpoints) return null;

    return endpoints.sort((a, b) => parseVersion(b.version) - parseVersion(a.version))[0];
  }

  /**
   * Register version
   */
  registerVersion(config: VersionConfig): void {
    this.versions.set(config.version, config);
  }

  /**
   * Get version config
   */
  getVersionConfig(version: APIVersion): VersionConfig | null {
    return this.versions.get(version) || null;
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): APIVersion[] {
    return Array.from(this.versions.entries())
      .filter(([_, config]) => config.supported)
      .map(([version]) => version);
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): APIVersion[] {
    return Array.from(this.versions.entries())
      .filter(([_, config]) => config.deprecated)
      .map(([version]) => version);
  }
}

/**
 * Parse version string to number
 */
function parseVersion(version: string): number {
  const [major, minor] = version.split(".").map(Number);
  return major * 10 + minor;
}

/**
 * Global registry
 */
export const apiRegistry = new APIVersionRegistry();

/**
 * Initialize API versions
 */
export function initializeVersions(): void {
  apiRegistry.registerVersion({
    version: "1.0",
    supported: true,
    deprecated: true,
    sunsetDate: new Date("2026-01-01"),
    features: ["basic"],
  });

  apiRegistry.registerVersion({
    version: "2.0",
    supported: true,
    deprecated: false,
    features: ["basic", "advanced", "realtime"],
  });

  apiRegistry.registerVersion({
    version: "3.0",
    supported: true,
    deprecated: false,
    features: ["basic", "advanced", "realtime", "ai", "webhooks"],
  });
}

/**
 * Extract version from request
 */
export function extractVersion(req: any): APIVersion {
  // Check header
  const headerVersion = req.headers["x-api-version"];
  if (headerVersion) return headerVersion as APIVersion;

  // Check query param
  const queryVersion = req.query.version;
  if (queryVersion) return queryVersion as APIVersion;

  // Check URL path
  const pathMatch = req.path.match(/\/v(\d+\.\d+)\//);
  if (pathMatch) return pathMatch[1] as APIVersion;

  // Default to latest
  return "3.0";
}

/**
 * Version middleware
 */
export function versionMiddleware(req: any, res: any, next: () => void): void {
  const version = extractVersion(req);
  const config = apiRegistry.getVersionConfig(version);

  if (!config) {
    res.status(400).json({
      error: "Invalid API version",
      supportedVersions: apiRegistry.getSupportedVersions(),
    });
    return;
  }

  if (!config.supported) {
    res.status(410).json({
      error: "API version no longer supported",
      supportedVersions: apiRegistry.getSupportedVersions(),
    });
    return;
  }

  // Add deprecation header if deprecated
  if (config.deprecated) {
    res.setHeader("X-API-Deprecated", "true");
    if (config.sunsetDate) {
      res.setHeader("Sunset", config.sunsetDate.toISOString());
    }
  }

  // Store version in request
  (req as any).apiVersion = version;

  next();
}

/**
 * Transform response for version compatibility
 */
export function transformForVersion(data: any, version: APIVersion): any {
  switch (version) {
    case "1.0":
      return transformToV1(data);
    case "2.0":
      return transformToV2(data);
    case "3.0":
      return data; // Latest version, no transformation
    default:
      return data;
  }
}

/**
 * Transform to v1 format
 */
function transformToV1(data: any): any {
  // Remove features not available in v1
  if (Array.isArray(data)) {
    return data.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { realtime, webhooks, ai, ...rest } = item;
      return rest;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { realtime, webhooks, ai, ...rest } = data;
  return rest;
}

/**
 * Transform to v2 format
 */
function transformToV2(data: any): any {
  // Remove v3-only features
  if (Array.isArray(data)) {
    return data.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ai, ...rest } = item;
      return rest;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ai, ...rest } = data;
  return rest;
}

/**
 * Check feature availability
 */
export function hasFeature(version: APIVersion, feature: string): boolean {
  const config = apiRegistry.getVersionConfig(version);
  return config ? config.features.includes(feature) : false;
}

/**
 * Get deprecation info
 */
export function getDeprecationInfo(version: APIVersion): {
  deprecated: boolean;
  sunsetDate?: Date;
  message?: string;
} {
  const config = apiRegistry.getVersionConfig(version);

  if (!config) {
    return { deprecated: false };
  }

  if (!config.deprecated) {
    return { deprecated: false };
  }

  return {
    deprecated: true,
    sunsetDate: config.sunsetDate,
    message: `API version ${version} is deprecated and will be sunset on ${config.sunsetDate?.toLocaleDateString()}`,
  };
}

/**
 * Migrate data between versions
 */
export function migrateData(data: any, fromVersion: APIVersion, toVersion: APIVersion): any {
  if (fromVersion === toVersion) return data;

  // Apply migrations sequentially
  const versions: APIVersion[] = ["1.0", "1.1", "2.0", "2.1", "3.0"];
  const fromIndex = versions.indexOf(fromVersion);
  const toIndex = versions.indexOf(toVersion);

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error("Invalid version for migration");
  }

  let result = data;

  if (fromIndex < toIndex) {
    // Upgrade
    for (let i = fromIndex; i < toIndex; i++) {
      result = upgradeVersion(result, versions[i], versions[i + 1]);
    }
  } else {
    // Downgrade
    for (let i = fromIndex; i > toIndex; i--) {
      result = downgradeVersion(result, versions[i], versions[i - 1]);
    }
  }

  return result;
}

/**
 * Upgrade data to next version
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function upgradeVersion(data: any, from: APIVersion, to: APIVersion): any {
  // Version-specific upgrade logic
  return data;
}

/**
 * Downgrade data to previous version
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function downgradeVersion(data: any, from: APIVersion, to: APIVersion): any {
  // Version-specific downgrade logic
  return data;
}

/**
 * Get changelog between versions
 */
export function getChangelog(from: APIVersion, to: APIVersion): string[] {
  const changes: Record<string, string[]> = {
    "1.0-2.0": [
      "Added real-time capabilities",
      "Added webhooks support",
      "Improved authentication",
    ],
    "2.0-3.0": ["Added AI features", "Enhanced analytics", "GraphQL support"],
  };

  return changes[`${from}-${to}`] || [];
}
