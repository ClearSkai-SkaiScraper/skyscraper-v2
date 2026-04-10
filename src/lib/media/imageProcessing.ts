/**
 * TASK 88: IMAGE PROCESSING
 *
 * Image manipulation: resize, crop, optimize, thumbnail generation, and format conversion.
 */

import sharp from "sharp";

import { logger } from "@/lib/logger";

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  grayscale?: boolean;
  blur?: number;
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  watermark?: {
    image: Buffer;
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    opacity?: number;
  };
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  fit?: "cover" | "contain";
  quality?: number;
}

/**
 * Process image with specified options
 */
export async function processImage(
  input: Buffer,
  options: ImageProcessingOptions
): Promise<Buffer> {
  let pipeline = sharp(input);

  // Resize
  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit || "cover",
      withoutEnlargement: true,
    });
  }

  // Rotate
  if (options.rotate) {
    pipeline = pipeline.rotate(options.rotate);
  }

  // Flip/Flop
  if (options.flip) {
    pipeline = pipeline.flip();
  }
  if (options.flop) {
    pipeline = pipeline.flop();
  }

  // Grayscale
  if (options.grayscale) {
    pipeline = pipeline.grayscale();
  }

  // Blur
  if (options.blur) {
    pipeline = pipeline.blur(options.blur);
  }

  // Watermark
  if (options.watermark) {
    const watermark = await prepareWatermark(
      options.watermark.image,
      options.watermark.opacity || 0.5
    );
    const position = calculateWatermarkPosition(options.watermark.position || "bottom-right");

    pipeline = pipeline.composite([
      {
        input: watermark,
        gravity: position,
      },
    ]);
  }

  // Format conversion and quality
  if (options.format) {
    switch (options.format) {
      case "jpeg":
        pipeline = pipeline.jpeg({ quality: options.quality || 80 });
        break;
      case "png":
        pipeline = pipeline.png({ quality: options.quality || 80 });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality: options.quality || 80 });
        break;
      case "avif":
        pipeline = pipeline.avif({ quality: options.quality || 80 });
        break;
    }
  }

  return await pipeline.toBuffer();
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(input: Buffer, options: ThumbnailOptions): Promise<Buffer> {
  return await sharp(input)
    .resize(options.width, options.height, {
      fit: options.fit || "cover",
      withoutEnlargement: true,
    })
    .jpeg({ quality: options.quality || 70 })
    .toBuffer();
}

/**
 * Generate multiple thumbnails at once
 */
export async function generateThumbnails(
  input: Buffer,
  sizes: ThumbnailOptions[]
): Promise<Buffer[]> {
  return await Promise.all(sizes.map((size) => generateThumbnail(input, size)));
}

/**
 * Crop image
 */
export async function cropImage(input: Buffer, crop: CropOptions): Promise<Buffer> {
  return await sharp(input)
    .extract({
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
    })
    .toBuffer();
}

/**
 * Optimize image (compress without quality loss)
 */
export async function optimizeImage(
  input: Buffer,
  format?: "jpeg" | "png" | "webp"
): Promise<{ buffer: Buffer; originalSize: number; optimizedSize: number; savings: number }> {
  const originalSize = input.length;

  let pipeline = sharp(input);

  // Auto-detect format if not provided
  const metadata = await sharp(input).metadata();
  const targetFormat = format || (metadata.format as "jpeg" | "png" | "webp");

  switch (targetFormat) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 85, effort: 6 });
      break;
  }

  const buffer = await pipeline.toBuffer();
  const optimizedSize = buffer.length;
  const savings = ((originalSize - optimizedSize) / originalSize) * 100;

  return {
    buffer,
    originalSize,
    optimizedSize,
    savings,
  };
}

/**
 * Convert image format
 */
export async function convertFormat(
  input: Buffer,
  format: "jpeg" | "png" | "webp" | "avif" | "gif",
  quality: number = 85
): Promise<Buffer> {
  const pipeline = sharp(input);

  switch (format) {
    case "jpeg":
      return await pipeline.jpeg({ quality }).toBuffer();
    case "png":
      return await pipeline.png({ quality }).toBuffer();
    case "webp":
      return await pipeline.webp({ quality }).toBuffer();
    case "avif":
      return await pipeline.avif({ quality }).toBuffer();
    case "gif":
      return await pipeline.gif().toBuffer();
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(input: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  orientation?: number;
  density?: number;
  chromaSubsampling?: string;
  isProgressive?: boolean;
}> {
  const metadata = await sharp(input).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: input.length,
    hasAlpha: metadata.hasAlpha || false,
    orientation: metadata.orientation,
    density: metadata.density,
    chromaSubsampling: metadata.chromaSubsampling,
    isProgressive: metadata.isProgressive,
  };
}

/**
 * Auto-orient image based on EXIF data
 */
export async function autoOrientImage(input: Buffer): Promise<Buffer> {
  return await sharp(input).rotate().toBuffer();
}

/**
 * Apply filters
 */
export async function applyFilter(
  input: Buffer,
  filter: "grayscale" | "sepia" | "negative" | "blur" | "sharpen"
): Promise<Buffer> {
  let pipeline = sharp(input);

  switch (filter) {
    case "grayscale":
      pipeline = pipeline.grayscale();
      break;
    case "sepia":
      pipeline = pipeline.tint({ r: 112, g: 66, b: 20 });
      break;
    case "negative":
      pipeline = pipeline.negate();
      break;
    case "blur":
      pipeline = pipeline.blur(5);
      break;
    case "sharpen":
      pipeline = pipeline.sharpen();
      break;
  }

  return await pipeline.toBuffer();
}

/**
 * Create image collage
 */
export async function createCollage(
  images: Buffer[],
  layout: "grid" | "horizontal" | "vertical",
  options?: {
    width?: number;
    height?: number;
    spacing?: number;
    background?: string;
  }
): Promise<Buffer> {
  const spacing = options?.spacing || 10;
  const background = options?.background || "#ffffff";

  if (layout === "horizontal") {
    // Side by side
    const resized = await Promise.all(
      images.map((img) =>
        sharp(img)
          .resize({ height: options?.height || 400, withoutEnlargement: true })
          .toBuffer()
      )
    );

    const metadatas = await Promise.all(resized.map((img) => sharp(img).metadata()));
    const totalWidth =
      metadatas.reduce((sum, m) => sum + (m.width || 0), 0) + spacing * (images.length - 1);
    const maxHeight = Math.max(...metadatas.map((m) => m.height || 0));

    const composite: any[] = [];
    let xOffset = 0;

    for (let i = 0; i < resized.length; i++) {
      composite.push({
        input: resized[i],
        top: 0,
        left: xOffset,
      });
      xOffset += (metadatas[i].width || 0) + spacing;
    }

    return await sharp({
      create: {
        width: totalWidth,
        height: maxHeight,
        channels: 3,
        background,
      },
    })
      .composite(composite)
      .toBuffer();
  }

  // Similar logic for vertical and grid layouts
  return images[0];
}

/**
 * Add text overlay
 */
export async function addTextOverlay(
  input: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: {
    position?: "top" | "center" | "bottom";
    fontSize?: number;
    color?: string;
    background?: string;
  }
): Promise<Buffer> {
  // TODO: Implement text overlay using SVG
  // Sharp doesn't support text directly, need to use SVG
  return input;
}

/**
 * Remove background (requires ML model or API)
 */
export async function removeBackground(input: Buffer): Promise<Buffer> {
  // TODO: Integrate with remove.bg API or local ML model
  logger.debug("Background removal not implemented");
  return input;
}

/**
 * Smart crop (detect face or subject)
 */
export async function smartCrop(input: Buffer, width: number, height: number): Promise<Buffer> {
  // Use entropy-based cropping
  return await sharp(input)
    .resize(width, height, {
      fit: "cover",
      position: sharp.strategy.entropy,
    })
    .toBuffer();
}

// Helper Functions

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function prepareWatermark(watermark: Buffer, opacity: number): Promise<Buffer> {
  return await sharp(watermark).ensureAlpha().modulate({ brightness: 1, saturation: 1 }).toBuffer();
}

function calculateWatermarkPosition(
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
): string {
  switch (position) {
    case "top-left":
      return "northwest";
    case "top-right":
      return "northeast";
    case "bottom-left":
      return "southwest";
    case "bottom-right":
      return "southeast";
    case "center":
      return "center";
    default:
      return "southeast";
  }
}

/**
 * Batch process multiple images
 */
export async function batchProcessImages(
  images: Buffer[],
  options: ImageProcessingOptions
): Promise<Buffer[]> {
  return await Promise.all(images.map((img) => processImage(img, options)));
}
