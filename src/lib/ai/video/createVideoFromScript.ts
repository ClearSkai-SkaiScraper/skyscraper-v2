// lib/ai/video/createVideoFromScript.ts
import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

import { createPlaceholderVideo } from "./placeholderVideo";
import type { VideoScript } from "./types";

/**
 * Creates a video from a script using available providers or graceful fallback.
 *
 * Provider Priority:
 * 1. OpenAI Sora (if OPENAI_API_KEY + OPENAI_VIDEO_MODEL env vars present)
 * 2. Synthesia (if SYNTHESIA_API_KEY present)
 * 3. Placeholder video (always succeeds)
 */
export async function createVideoFromScript(script: VideoScript): Promise<Buffer> {
  logger.debug(`[Video Generation] Starting for ${script.kind}: ${script.title}`);
  logger.debug(`[VIDEO_GEN] Duration: ${script.durationSeconds}s, Scenes: ${script.scenes.length}`);

  const combinedPrompt = script.scenes
    .map(
      (scene) =>
        `Scene ${scene.id}: ${scene.title}\nVOICEOVER: ${scene.voiceover}\nVISUAL: ${scene.visualPrompt}`
    )
    .join("\n\n");

  // Try OpenAI Sora first (when available)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_VIDEO_MODEL) {
    try {
      logger.debug("[Video Generation] Attempting OpenAI Sora...");
      return await generateWithOpenAI(script, combinedPrompt);
    } catch (error: any) {
      logger.error("[VIDEO_GEN] OpenAI failed", { error: error.message });
      // Fall through to next provider
    }
  }

  // Try Synthesia as fallback
  if (process.env.SYNTHESIA_API_KEY) {
    try {
      logger.debug("[Video Generation] Attempting Synthesia...");
      return await generateWithSynthesia(script, combinedPrompt);
    } catch (error: any) {
      logger.error("[VIDEO_GEN] Synthesia failed", { error: error.message });
      // Fall through to placeholder
    }
  }

  // Final fallback: Generate placeholder video
  logger.debug("[Video Generation] Using placeholder video (no provider configured)");
  return await createPlaceholderVideo(script);
}

/**
 * Generate video using OpenAI Sora
 */
async function generateWithOpenAI(script: VideoScript, prompt: string): Promise<Buffer> {
  const openai = getOpenAI();

  const response = await (openai as any).videos.generate({
    model: process.env.OPENAI_VIDEO_MODEL || "sora-1.0",
    prompt: prompt,
    duration: script.durationSeconds,
    aspect_ratio: "16:9",
    response_format: "b64_json",
  });

  if (!response.data?.[0]?.b64_json) {
    throw new Error("No video data returned from OpenAI");
  }

  logger.debug("[Video Generation] OpenAI success");
  return Buffer.from(response.data[0].b64_json, "base64");
}

/**
 * Generate video using Synthesia
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateWithSynthesia(script: VideoScript, prompt: string): Promise<Buffer> {
  const narration = script.scenes.map((s) => s.voiceover).join(" ");

  const response = await fetch("https://api.synthesia.io/v2/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SYNTHESIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: script.title,
      script: narration,
      avatar: "professional_male_1",
      background: "office",
      aspectRatio: "16:9",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Synthesia API error: ${error}`);
  }

  const data = await response.json();

  // Synthesia returns video ID, need to poll for completion
  const videoId = data.id;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s

    const statusResponse = await fetch(`https://api.synthesia.io/v2/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SYNTHESIA_API_KEY}`,
      },
    });

    const statusData = await statusResponse.json();

    if (statusData.status === "complete" && statusData.download) {
      // Download the video
      const videoResponse = await fetch(statusData.download);
      const buffer = await videoResponse.arrayBuffer();
      logger.debug("[Video Generation] Synthesia success");
      return Buffer.from(buffer);
    }

    if (statusData.status === "error") {
      throw new Error(`Synthesia video generation failed: ${statusData.error}`);
    }

    attempts++;
  }

  throw new Error("Synthesia video generation timed out");
}
