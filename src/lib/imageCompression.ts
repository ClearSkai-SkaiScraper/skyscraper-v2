/**
 * ============================================================================
 * Client-Side Image Compression
 * ============================================================================
 *
 * Compresses images before upload to avoid Vercel's 4.5MB body size limit
 * for serverless functions. Uses the browser's Canvas API.
 *
 * SUPPORTS:
 *   - JPEG, PNG, WebP: Always works
 *   - HEIC/HEIF: Works on Safari (macOS/iOS), may not work on Chrome/Firefox
 *
 * STRATEGY:
 *   1. If file is under the threshold, return as-is
 *   2. Try to load the image via Image element
 *   3. Resize to max dimensions (preserving aspect ratio)
 *   4. Export as JPEG at configurable quality
 *   5. If compression fails (e.g., unsupported format), return original file
 *
 * ============================================================================
 */

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB threshold (Vercel limit is 4.5MB)
const MAX_DIMENSION = 2400; // Max width or height in pixels
const JPEG_QUALITY = 0.85; // 85% JPEG quality

/**
 * Compress an image file if it exceeds the size threshold.
 * Returns a compressed File or the original if compression isn't needed/possible.
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeBytes?: number;
    maxDimension?: number;
    quality?: number;
  }
): Promise<File> {
  const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE;
  const maxDim = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? JPEG_QUALITY;

  // ALWAYS convert HEIC/HEIF files (browsers can't display them)
  const isHeic = isHeicFile(file);

  // Skip if file is already small enough AND not HEIC
  if (file.size <= maxSize && !isHeic) {
    return file;
  }

  // Skip non-image files
  if (!file.type.startsWith("image/") && !isHeic) {
    return file;
  }

  try {
    // For HEIC files, try heic2any library first (better browser support)
    if (isHeic) {
      try {
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: quality });
        const converted = Array.isArray(blob) ? blob[0] : blob;
        const jpegFile = new File([converted], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        console.log(`[ImageCompression] HEIC→JPEG: ${file.name} → ${formatBytes(jpegFile.size)}`);
        return jpegFile;
      } catch (heicErr) {
        console.warn(
          `[ImageCompression] heic2any failed for ${file.name}, trying Canvas fallback:`,
          heicErr
        );
        // Fall through to Canvas-based conversion
      }
    }

    const bitmap = await loadImageBitmap(file);
    if (!bitmap) {
      console.warn(`[ImageCompression] Could not load image: ${file.name}`);
      return file;
    }

    // Calculate new dimensions (preserve aspect ratio)
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Export as JPEG blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob || blob.size >= file.size) {
      // Compression didn't help, return original
      return file;
    }

    // Create a new File with .jpg extension
    const compressedName = file.name.replace(/\.[^.]+$/, ".jpg");
    const compressedFile = new File([blob], compressedName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    console.log(
      `[ImageCompression] ${file.name}: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`
    );

    return compressedFile;
  } catch (err) {
    console.warn(`[ImageCompression] Failed to compress ${file.name}:`, err);
    return file;
  }
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(
  files: File[],
  options?: {
    maxSizeBytes?: number;
    maxDimension?: number;
    quality?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<File[]> {
  const results: File[] = [];
  let completed = 0;

  for (const file of files) {
    const compressed = await compressImage(file, options);
    results.push(compressed);
    completed++;
    options?.onProgress?.(completed, files.length);
  }

  return results;
}

/**
 * Try to load an image as an ImageBitmap.
 * Uses createImageBitmap which supports more formats than Image element.
 */
async function loadImageBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    // createImageBitmap handles HEIC on Safari and all standard formats
    return await createImageBitmap(file);
  } catch {
    // Fallback: try loading via Image element (for older browsers)
    try {
      return await loadViaImageElement(file);
    } catch {
      return null;
    }
  }
}

/**
 * Fallback: load image via Image element + object URL.
 */
function loadViaImageElement(file: File): Promise<ImageBitmap | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const bitmap = await createImageBitmap(img);
        resolve(bitmap);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function isHeicFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif"
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
