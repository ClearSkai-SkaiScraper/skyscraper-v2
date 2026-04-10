/**
 * 🔥 PHASE 27.2: SKAI VIDEO AI - SCRIPT & STORYBOARD ENGINE
 *
 * Converts lead damage data into cinematic video scripts and storyboards
 */

import { withConditionalCache } from "@/lib/ai/cache";
import { getOpenAI } from "@/lib/ai/client";
import { withConditionalDedupe } from "@/lib/ai/dedupe";
import { trackPerformance } from "@/lib/ai/perf";
import { logger } from "@/lib/logger";
// modeSelector archived — stub inline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectModelForOrg = async (_orgId: string): Promise<any> => "gpt-4o-mini";

const openai = getOpenAI();

interface VideoScriptInput {
  leadId: string;
  address?: string;
  photos: { url: string }[];
  title?: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiSummaryJson?: any;
  aiUrgencyScore?: number | null;
  aiJobType?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiFlags?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiMaterials?: any;
}

interface VideoScriptSection {
  id: string;
  label: string;
  narration: string;
  imageRefs?: string[];
  emphasis?: string[];
}

interface VideoScript {
  title: string;
  tone: "professional" | "reassuring" | "detailed";
  sections: VideoScriptSection[];
}

interface StoryboardScene {
  id: string;
  sectionId: string;
  durationSec: number;
  prompt: string;
  motion?: string;
  overlayText?: string;
  highlightArea?: [number, number, number, number] | null;
}

interface VideoStoryboard {
  scenes: StoryboardScene[];
}

/**
 * Internal video script generation (unwrapped)
 */
async function _generateVideoScriptInternal(input: VideoScriptInput): Promise<VideoScript> {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    leadId,
    address,
    photos,
    aiSummaryJson,
    aiUrgencyScore,
    aiJobType,
    aiFlags,
    aiMaterials,
  } = input;

  // Build comprehensive prompt
  const prompt = `You are creating a professional property damage inspection video script.

PROPERTY INFORMATION:
- Address: ${address || "Property Address"}
- Photos Available: ${photos.length}
- Job Type: ${aiJobType || "General Inspection"}

AI DAMAGE ANALYSIS:
- Urgency Score: ${aiUrgencyScore || 0}/100
- Summary: ${JSON.stringify(aiSummaryJson || {})}
- Flags: ${JSON.stringify(aiFlags || {})}
- Materials: ${JSON.stringify(aiMaterials || [])}

REQUIREMENTS:
Create a 3-7 section video script that tells a clear, professional story about this property damage.

Each section should have:
1. A clear label (e.g., "Introduction", "Roof Damage Overview", "Urgent Issues", "Recommendations")
2. Narration text (30-60 words) - what the AI voiceover will say
3. imageRefs - which photos to show (use indices like ["0", "1", "2"])
4. emphasis - key phrases to highlight visually

TONE: Professional, calm, explanatory
STYLE: Like a contractor briefing an adjuster

Return ONLY valid JSON in this exact format:
{
  "title": "Property Damage Report - [Address]",
  "tone": "professional",
  "sections": [
    {
      "id": "intro",
      "label": "Introduction",
      "narration": "This is a preliminary AI-driven inspection report...",
      "imageRefs": ["0"],
      "emphasis": ["AI-driven inspection"]
    },
    {
      "id": "damage-overview",
      "label": "Damage Overview",
      "narration": "Our analysis detected multiple areas of concern...",
      "imageRefs": ["1", "2", "3"],
      "emphasis": ["multiple areas", "immediate attention"]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert video scriptwriter for property damage inspection reports. Create professional, clear, calm narration scripts. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const script: VideoScript = JSON.parse(content);

    // Ensure IDs are unique
    script.sections = script.sections.map((section, idx) => ({
      ...section,
      id: section.id || `section-${idx}`,
    }));

    return script;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Error generating video script:", error);

    // Return safe fallback script
    return {
      title: `Property Damage Report - ${address || "Unknown Address"}`,
      tone: "professional",
      sections: [
        {
          id: "intro",
          label: "Introduction",
          narration: `This is a preliminary AI-driven property damage inspection report for ${address || "the property"}.`,
          imageRefs: photos.length > 0 ? ["0"] : [],
          emphasis: ["AI-driven inspection"],
        },
        {
          id: "findings",
          label: "Key Findings",
          narration: `Our analysis has identified areas requiring attention. A detailed assessment follows.`,
          imageRefs: photos.slice(0, 3).map((_, i) => i.toString()),
          emphasis: ["areas requiring attention"],
        },
        {
          id: "next-steps",
          label: "Next Steps",
          narration: `We recommend a thorough on-site inspection to confirm these findings and develop a comprehensive repair plan.`,
          imageRefs: [],
          emphasis: ["on-site inspection", "repair plan"],
        },
      ],
    };
  }
}

/**
 * PHASE 34: Wrapped video script generation with cache/dedupe/perf
 */
export async function generateVideoScript(
  input: VideoScriptInput,
  orgId: string
): Promise<VideoScript> {
  const model = await selectModelForOrg(orgId);

  const result = await withConditionalCache(
    "skai-video-script",
    { leadId: input.leadId, photos: input.photos.length },
    async () => {
      return withConditionalDedupe(
        "skai-video-script",
        { leadId: input.leadId },
        async () => {
          return trackPerformance(
            {
              routeName: "skai-video-script",
              orgId,
              leadId: input.leadId,
              model,
              cacheHit: false,
            },
            () => _generateVideoScriptInternal(input)
          );
        },
        { orgId }
      );
    },
    { orgId, cacheTTL: 604800 }
  );

  return result.data as VideoScript;
}

/**
 * 🎬 PHASE 27.3: Enhanced storyboard generation with cinematic motion
 * Generate storyboard from video script with improved visuals
 */
async function _generateVideoStoryboardInternal(script: VideoScript): Promise<VideoStoryboard> {
  const scenes: StoryboardScene[] = [];
  let sceneCounter = 0;

  for (const section of script.sections) {
    // Create 1-2 scenes per section based on narration length
    const wordCount = section.narration.split(" ").length;
    const scenesPerSection = wordCount > 40 ? 2 : 1;
    const durationPerScene = Math.ceil(((wordCount / 150) * 60) / scenesPerSection); // ~150 words/min

    for (let i = 0; i < scenesPerSection; i++) {
      const isFirstScene = i === 0;
      const sceneIndex = i;

      // 🎥 PHASE 27.3: Build enhanced cinematic prompt with motion details
      let prompt = "";
      let motion = "";
      let overlayText: string | undefined;
      let highlightArea: [number, number, number, number] | null = null;

      if (section.id === "intro") {
        prompt =
          "Cinematic establishing shot of property exterior, golden hour lighting with warm tones, professional architectural photography, sharp focus on building facade, clear sky background";
        motion = "slow_pan";
        overlayText = section.label;
      } else if (section.id.includes("damage") || section.id.includes("overview")) {
        prompt =
          "Close-up inspection footage of damaged area, shallow depth of field focusing on damage, professional documentation lighting, detailed texture visible, neutral color grading";
        motion = sceneIndex === 0 ? "push_in" : "slow_pan";
        overlayText = isFirstScene ? section.label : undefined;
        // Highlight central damage area (30-70% of frame)
        highlightArea = [0.3, 0.3, 0.7, 0.7];
      } else if (section.id.includes("urgent") || section.id.includes("concern")) {
        prompt =
          "Detailed damage inspection close-up, zoom focus on critical structural issue, high contrast lighting to emphasize severity, documentary style with visible deterioration";
        motion = "push_in";
        overlayText = isFirstScene ? "⚠️ " + section.label : undefined;
        // Highlight critical area with emphasis
        highlightArea = [0.25, 0.25, 0.75, 0.75];
      } else if (section.id.includes("recommend") || section.id.includes("next")) {
        prompt =
          "Clean professional outro screen, fade to branded background with company colors, clear typography for call-to-action, modern minimal design";
        motion = "static";
        overlayText = section.label;
      } else if (section.id.includes("finding") || section.id.includes("assessment")) {
        prompt =
          "Wide angle assessment shot showing context of damage, environmental factors visible, professional inspection documentation, balanced exposure";
        motion = "orbit";
        overlayText = isFirstScene ? section.label : undefined;
      } else {
        prompt =
          "Professional property inspection footage, smooth cinematic camera movement, well-lit with natural lighting, sharp focus on inspection area, documentation style";
        motion = sceneIndex % 2 === 0 ? "slow_pan" : "static";
        overlayText = isFirstScene ? section.label : undefined;
      }

      scenes.push({
        id: `scene-${sceneCounter++}`,
        sectionId: section.id,
        durationSec: durationPerScene,
        prompt,
        motion,
        overlayText,
        highlightArea,
      });
    }
  }

  return { scenes };
}

/**
 * PHASE 34: Wrapped storyboard generation with cache/dedupe/perf
 */
export async function generateVideoStoryboard(
  script: VideoScript,
  orgId: string
): Promise<VideoStoryboard> {
  const model = await selectModelForOrg(orgId);

  const result = await withConditionalCache(
    "skai-video-storyboard",
    { scriptSections: script.sections.length, scriptTitle: script.title },
    async () => {
      return withConditionalDedupe(
        "skai-video-storyboard",
        { scriptTitle: script.title },
        async () => {
          return trackPerformance(
            {
              routeName: "skai-video-storyboard",
              orgId,
              model,
              cacheHit: false,
            },
            () => _generateVideoStoryboardInternal(script)
          );
        },
        { orgId }
      );
    },
    { orgId, cacheTTL: 604800 }
  );

  return result.data as VideoStoryboard;
}

/**
 * Estimate total video duration from storyboard
 */
export function estimateVideoDuration(storyboard: VideoStoryboard): number {
  return storyboard.scenes.reduce((total, scene) => total + scene.durationSec, 0);
}

/**
 * Validate input has sufficient data for video generation
 */
export function validateVideoInput(input: VideoScriptInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.photos || input.photos.length === 0) {
    errors.push("At least 1 photo is required for video generation");
  }

  if (input.photos && input.photos.length > 50) {
    errors.push("Maximum 50 photos supported");
  }

  if (!input.address && !input.aiSummaryJson) {
    errors.push("Property address or AI summary required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
