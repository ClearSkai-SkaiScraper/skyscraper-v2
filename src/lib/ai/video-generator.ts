/**
 * 🔥 PHASE 27: SKAI VIDEO AI (v1.5)
 *
 * Video Script Generator & Storyboard Engine
 * Converts AI insights + photos into cinematic damage reports
 */

import { getOpenAI } from "@/lib/ai/client";

const openai = getOpenAI();

interface LeadData {
  id: string;
  customerName?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  photos?: any[];
  aiSummaryJson?: any;
  aiUrgencyScore?: number;
  aiNextActions?: any[];
  aiJobType?: string;
  aiMaterials?: any[];
  aiFlags?: any;
  aiImages?: any[];
  aiConfidence?: number;
}

interface VideoScene {
  scene: string;
  duration: number; // seconds
  narration: string;
  visualStyle: string;
  imageRefs?: string[]; // References to photo URLs
  motions?: string[]; // Camera movements
  overlayText?: string;
  highlightAreas?: number[][]; // Bounding boxes [x, y, width, height]
}

interface VideoScript {
  title: string;
  description: string;
  totalDuration: number;
  tone: string; // professional, educational, reassuring
  targetAudience: string; // homeowner, contractor, adjuster
  sections: VideoScene[];
}

interface StoryboardFrame {
  frameNumber: number;
  timestamp: number; // seconds from start
  duration: number;
  prompt: string; // For video generation model
  motion: string; // camera movement
  overlayText?: string;
  highlightArea?: number[]; // Bounding box
  imageUrl?: string; // Source photo if using
  transitionType?: string; // crossfade, slide, pan
}

interface Storyboard {
  totalFrames: number;
  totalDuration: number;
  fps: number;
  resolution: string; // "1920x1080"
  frames: StoryboardFrame[];
}

/**
 * Generate AI video script from lead data
 */
export async function generateVideoScript(
  lead: LeadData,
  options: {
    tone?: "professional" | "educational" | "reassuring";
    audience?: "homeowner" | "contractor" | "adjuster";
    maxDuration?: number; // seconds
  } = {}
): Promise<VideoScript> {
  const { tone = "professional", audience = "homeowner", maxDuration = 60 } = options;

  // Build comprehensive prompt
  const prompt = `You are creating a video script for a professional property damage inspection report.

LEAD INFORMATION:
- Customer: ${lead.customerName || "Property Owner"}
- Address: ${lead.address || "Address not provided"}, ${lead.city || ""} ${lead.state || ""}
- Description: ${lead.description || "No description"}
- Job Type: ${lead.aiJobType || "General Inspection"}

AI ANALYSIS:
- Urgency Score: ${lead.aiUrgencyScore || 0}/100
- Confidence: ${((lead.aiConfidence || 0) * 100).toFixed(0)}%
- Summary: ${JSON.stringify(lead.aiSummaryJson || {})}
- Flags: ${JSON.stringify(lead.aiFlags || {})}
- Materials Detected: ${JSON.stringify(lead.aiMaterials || [])}
- Next Actions: ${JSON.stringify(lead.aiNextActions || [])}

PHOTOS: ${lead.photos?.length || 0} images available
VISION AI: ${lead.aiImages?.length || 0} images analyzed

TARGET AUDIENCE: ${audience}
TONE: ${tone}
MAX DURATION: ${maxDuration} seconds

Create a video script with 4-8 scenes that tells a compelling story about this property damage.

REQUIREMENTS:
1. Start with an intro establishing the property
2. Show damage overview with specific findings
3. Highlight urgent issues or safety concerns
4. Present recommended actions
5. End with next steps and call-to-action

For each scene provide:
- scene name (intro, damage-overview, urgent-issues, recommendations, next-steps)
- duration (in seconds)
- narration (what the AI voiceover will say, 30-60 words)
- visualStyle (cinematic description for video generation)
- imageRefs (which photos to reference, if any)
- motions (camera movements like "slow zoom", "pan left", "static")
- overlayText (any text to display on screen)
- highlightAreas (coordinates for damage highlights, if applicable)

Return ONLY valid JSON matching this structure:
{
  "title": "Property Damage Report - [Address]",
  "description": "Brief overview",
  "totalDuration": 45,
  "tone": "${tone}",
  "targetAudience": "${audience}",
  "sections": [
    {
      "scene": "intro",
      "duration": 5,
      "narration": "...",
      "visualStyle": "...",
      "imageRefs": [],
      "motions": ["slow zoom"],
      "overlayText": "...",
      "highlightAreas": []
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an expert video scriptwriter specializing in property damage inspection reports. Create professional, clear, and compelling video scripts that communicate technical findings in an accessible way. Always return valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const scriptContent = response.choices[0].message.content;
  if (!scriptContent) {
    throw new Error("Failed to generate video script");
  }

  const script: VideoScript = JSON.parse(scriptContent);
  return script;
}

/**
 * Generate detailed storyboard from video script
 */
export async function generateStoryboard(
  script: VideoScript,
  photos: string[]
): Promise<Storyboard> {
  const frames: StoryboardFrame[] = [];
  let currentTime = 0;
  let frameNumber = 0;

  for (const section of script.sections) {
    // Create 2-3 frames per scene based on duration
    const framesPerScene = Math.ceil(section.duration / 3);

    for (let i = 0; i < framesPerScene; i++) {
      const frameDuration = section.duration / framesPerScene;

      // Determine which photo to use
      let imageUrl: string | undefined;
      if (section.imageRefs && section.imageRefs.length > 0) {
        const refIndex =
          parseInt(section.imageRefs[i % section.imageRefs.length].replace("image", "")) - 1;
        imageUrl = photos[refIndex] || photos[0];
      }

      // Build video generation prompt
      const prompt = buildVideoPrompt(section, i, framesPerScene);

      frames.push({
        frameNumber: frameNumber++,
        timestamp: currentTime,
        duration: frameDuration,
        prompt,
        motion: section.motions?.[i % section.motions.length] || "static",
        overlayText: i === 0 ? section.overlayText : undefined,
        highlightArea: section.highlightAreas?.[i],
        imageUrl,
        transitionType: i === 0 ? "crossfade" : undefined,
      });

      currentTime += frameDuration;
    }
  }

  return {
    totalFrames: frames.length,
    totalDuration: currentTime,
    fps: 24,
    resolution: "1920x1080",
    frames,
  };
}

/**
 * Build video generation prompt for a specific frame
 */
function buildVideoPrompt(scene: VideoScene, frameIndex: number, totalFrames: number): string {
  const baseStyle = scene.visualStyle;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progress = (frameIndex / totalFrames) * 100;

  // Add cinematic qualities
  const cinematicElements = [
    "professional cinematography",
    "soft natural lighting",
    "shallow depth of field",
    "4K quality",
    "color graded",
  ];

  return `${baseStyle}, ${cinematicElements.join(", ")}, property inspection footage, ${scene.motions?.[0] || "smooth camera movement"}`;
}

/**
 * Estimate token cost for video generation
 */
export function estimateVideoTokens(script: VideoScript): number {
  // Base cost: 30 tokens
  let tokens = 30;

  // Add 5 tokens per scene
  tokens += script.sections.length * 5;

  // Add 10 tokens per minute of video
  tokens += Math.ceil(script.totalDuration / 60) * 10;

  return tokens;
}

/**
 * Validate lead has sufficient data for video generation
 */
export function validateLeadForVideo(lead: LeadData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!lead.photos || lead.photos.length === 0) {
    errors.push("At least 1 photo is required");
  }

  if (!lead.aiSummaryJson && !lead.description) {
    errors.push("Lead must have AI analysis or description");
  }

  if (lead.photos && lead.photos.length > 50) {
    errors.push("Maximum 50 photos supported");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
