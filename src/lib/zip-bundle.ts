// ============================================================================
// #178: ZIP Bundle Utility
// ============================================================================
// Real implementation using JSZip (already in package.json).
// Replaces the stub in src/lib/export/zipBuilder.ts with a client-usable
// utility for bundling multiple files into a downloadable ZIP.
// ============================================================================

import JSZip from "jszip";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BundleFile {
  /** Path inside the ZIP (e.g. "photos/front.jpg") */
  name: string;
  /** File content */
  content: Blob | ArrayBuffer | Uint8Array | string;
}

export interface BundleOptions {
  /** Root folder name inside the ZIP (optional) */
  rootFolder?: string;
  /** Compression level 1-9 (default 6) */
  compressionLevel?: number;
  /** Add a manifest.json listing all files */
  includeManifest?: boolean;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Create a ZIP bundle from multiple files.
 * Returns a Blob that can be downloaded or uploaded.
 *
 * @example
 * ```ts
 * import { createClaimBundle } from "@/lib/zip-bundle";
 *
 * const blob = await createClaimBundle([
 *   { name: "report.pdf",  content: pdfBlob },
 *   { name: "photos/1.jpg", content: photoBlob },
 * ]);
 *
 * // Trigger download
 * downloadBlob(blob, "claim-package.zip");
 * ```
 */
export async function createClaimBundle(
  files: BundleFile[],
  options: BundleOptions = {}
): Promise<Blob> {
  const zip = new JSZip();
  const { rootFolder, compressionLevel = 6, includeManifest = false } = options;

  const root = rootFolder ? zip.folder(rootFolder)! : zip;

  for (const file of files) {
    root.file(file.name, file.content, {
      binary: typeof file.content !== "string",
    });
  }

  // Optional manifest
  if (includeManifest) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      fileCount: files.length,
      files: files.map((f) => ({
        name: f.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        size: f.content instanceof Blob ? f.content.size : ((f.content as any).byteLength ?? 0),
      })),
    };
    root.file("manifest.json", JSON.stringify(manifest, null, 2));
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: compressionLevel },
  });
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetch a remote file and return it as a BundleFile.
 */
export async function fetchAsBundleFile(url: string, name: string): Promise<BundleFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const content = await res.blob();
  return { name, content };
}

/**
 * Bundle a full claim package: gathers PDFs, photos, and reports into a ZIP.
 * Accepts pre-resolved files or URLs to fetch.
 */
export async function bundleClaimPackage(opts: {
  claimNumber: string;
  files?: BundleFile[];
  photoUrls?: { url: string; filename: string }[];
  pdfBlob?: Blob;
}): Promise<Blob> {
  const allFiles: BundleFile[] = [];

  // Add explicit files
  if (opts.files) {
    allFiles.push(...opts.files);
  }

  // Add claim PDF
  if (opts.pdfBlob) {
    allFiles.push({
      name: `${opts.claimNumber}-report.pdf`,
      content: opts.pdfBlob,
    });
  }

  // Fetch photos in parallel
  if (opts.photoUrls?.length) {
    const photoFiles = await Promise.allSettled(
      opts.photoUrls.map((p) => fetchAsBundleFile(p.url, `photos/${p.filename}`))
    );
    for (const result of photoFiles) {
      if (result.status === "fulfilled") {
        allFiles.push(result.value);
      } else {
        logger.warn("[zip-bundle] Failed to fetch photo:", result.reason);
      }
    }
  }

  return createClaimBundle(allFiles, {
    rootFolder: `claim-${opts.claimNumber}`,
    includeManifest: true,
  });
}
