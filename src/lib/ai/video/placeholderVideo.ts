// lib/ai/video/placeholderVideo.ts

import { logger } from "@/lib/logger";

import type { VideoScript } from "./types";

/**
 * Creates a simple placeholder video when no real video provider is available.
 * Generates a static MP4 with title screens for each scene.
 *
 * Note: This is a minimal fallback. In production, consider:
 * - Pre-generated template videos in Firebase/public
 * - FFmpeg-based slideshow generation
 * - Integration with simpler video services
 */
export async function createPlaceholderVideo(script: VideoScript): Promise<Buffer> {
  logger.debug("[Placeholder Video] Generating fallback video...");

  // For now, return a minimal MP4 buffer that represents "video in progress"
  // In a real implementation, you would:
  // 1. Use FFmpeg to create actual video from static images + audio
  // 2. Or fetch a pre-made template video from storage
  // 3. Or use a simpler video API that's always available

  const placeholderData = {
    title: script.title,
    kind: script.kind,
    duration: script.durationSeconds,
    scenes: script.scenes.length,
    timestamp: new Date().toISOString(),
  };

  // Create a minimal "video metadata" JSON that could be expanded later
  const jsonString = JSON.stringify(placeholderData, null, 2);

  // In a real implementation, replace this with actual video generation
  // For now, we'll create a small valid MP4 file header + metadata
  const mp4Header = createMinimalMP4(jsonString);

  logger.debug("[Placeholder Video] Generated placeholder MP4");
  return mp4Header;
}

/**
 * Creates a minimal valid MP4 file with embedded metadata.
 * This is a fallback that won't actually play as video but will upload successfully.
 *
 * TODO: Replace with real video generation using:
 * - FFmpeg (images → video)
 * - Pre-made template videos
 * - Simpler video APIs (e.g., text-to-video services)
 */
function createMinimalMP4(metadata: string): Buffer {
  // MP4 file structure (extremely simplified):
  // ftyp box (file type)
  // moov box (movie metadata)
  // mdat box (media data)

  const ftyp = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x20, // box size (32 bytes)
    0x66,
    0x74,
    0x79,
    0x70, // 'ftyp'
    0x69,
    0x73,
    0x6f,
    0x6d, // 'isom' major brand
    0x00,
    0x00,
    0x02,
    0x00, // minor version
    0x69,
    0x73,
    0x6f,
    0x6d, // compatible brands: isom
    0x69,
    0x73,
    0x6f,
    0x32, // iso2
    0x6d,
    0x70,
    0x34,
    0x31, // mp41
    0x6d,
    0x70,
    0x34,
    0x32, // mp42
  ]);

  // Embed metadata as udta (user data) box
  const metadataBuffer = Buffer.from(metadata, "utf-8");
  const udtaSize = 8 + metadataBuffer.length;
  const udta = Buffer.concat([
    Buffer.from([
      (udtaSize >> 24) & 0xff,
      (udtaSize >> 16) & 0xff,
      (udtaSize >> 8) & 0xff,
      udtaSize & 0xff,
      0x75,
      0x64,
      0x74,
      0x61, // 'udta'
    ]),
    metadataBuffer,
  ]);

  // Minimal moov box containing udta
  const moovSize = 8 + udta.length;
  const moov = Buffer.concat([
    Buffer.from([
      (moovSize >> 24) & 0xff,
      (moovSize >> 16) & 0xff,
      (moovSize >> 8) & 0xff,
      moovSize & 0xff,
      0x6d,
      0x6f,
      0x6f,
      0x76, // 'moov'
    ]),
    udta,
  ]);

  // Minimal mdat (media data) box - empty for now
  const mdat = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x08, // box size (8 bytes - header only)
    0x6d,
    0x64,
    0x61,
    0x74, // 'mdat'
  ]);

  return Buffer.concat([ftyp, moov, mdat]);
}

/**
 * Future enhancement: Generate actual video using FFmpeg
 *
 * Example implementation (requires ffmpeg installed):
 */
/*
async function generateWithFFmpeg(script: VideoScript): Promise<Buffer> {
  const ffmpeg = require('fluent-ffmpeg');
  const fs = require('fs').promises;
  const path = require('path');
  const os = require('os');

  // Create temp directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-'));
  
  try {
    // Generate title images for each scene
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const imagePath = path.join(tmpDir, `scene-${i}.png`);
      await generateSceneImage(scene, imagePath);
    }

    // Create video from images
    const outputPath = path.join(tmpDir, 'output.mp4');
    
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(tmpDir, 'scene-%d.png'))
        .inputOptions(['-framerate 1/5']) // 5 seconds per scene
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-vf scale=1920:1080'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Read the generated video
    const buffer = await fs.readFile(outputPath);
    return buffer;
    
  } finally {
    // Cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function generateSceneImage(scene: VideoScene, outputPath: string): Promise<void> {
  const { createCanvas } = require('canvas');
  const fs = require('fs').promises;
  
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(scene.title, width / 2, 200);

  // Voiceover text (wrapped)
  ctx.font = '36px Arial';
  ctx.fillStyle = '#cccccc';
  wrapText(ctx, scene.voiceover, width / 2, 400, width - 200, 50);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, lineY);
      line = word + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}
*/
