// Lightweight asset version helper used by MockupImage
export function getAssetVersion(): string {
  try {
    // Prefer generated constant if present
    // Note: require in ESM context is guarded; this file is small and safe for client fallback.
    // If assetVersion.generated.ts exists it will be resolved by TS build.
    // @ts-ignore
    const mod = require("../config/assetVersion.generated");
    if (mod && mod.ASSET_VERSION) return mod.ASSET_VERSION;
  } catch {
    // ignore
  }
  // eslint-disable-next-line no-restricted-syntax
  return process.env.ASSET_VERSION || "2025-10-26";
}
