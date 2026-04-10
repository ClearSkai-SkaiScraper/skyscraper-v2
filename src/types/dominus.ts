/**
 * 🔥 PHASE D: Centralized Skai Types
 * 
 * Shared TypeScript types for SkaiPDF system
 */

// Lead AI Data
export interface SkaiLeadAIData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiSummaryJson: any;
  aiUrgencyScore: number;
  aiNextActions: string[];
  aiJobType: string;
  aiMaterials: string[];
  aiFlags: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiImages: any[];
  aiConfidence: number;
}

// Summary Structure
export interface SkaiSummary {
  overview: string;
  damageAreas: string[];
  estimatedSeverity: "low" | "medium" | "high" | "critical";
  primaryConcerns: string[];
  recommendations: string[];
}

// Next Action Item
export interface SkaiNextAction {
  action: string;
  priority: "low" | "medium" | "high";
  category: "inspection" | "documentation" | "communication" | "repair";
  estimatedTime?: string;
}

// Image Analysis Result
export interface SkaiImageAnalysis {
  imageUrl: string;
  damageTypes: string[];
  confidence: number;
  annotations: Array<{
    label: string;
    area?: [number, number, number, number]; // [x1, y1, x2, y2]
    severity?: string;
  }>;
  description: string;
}

// Video Script Types
export interface VideoScript {
  title: string;
  tone: "professional" | "reassuring" | "detailed";
  sections: VideoScriptSection[];
  totalDuration?: number;
}

export interface VideoScriptSection {
  id: string;
  label: string;
  narration: string;
  imageRefs?: string[];
  emphasis?: string[];
}

// Video Storyboard Types
export interface VideoStoryboard {
  scenes: VideoScene[];
  totalDuration?: number;
}

export interface VideoScene {
  id: string;
  sectionId: string;
  durationSec: number;
  prompt: string;
  motion?: string;
  overlayText?: string;
  highlightArea?: [number, number, number, number] | null;
}

// Video Render Types
export interface VideoRenderInput {
  leadId: string;
  scriptTitle: string;
  storyboard: VideoStoryboard;
  photos: Array<{ url: string }>;
  damageFlags?: string[];
  thumbnailPhotoUrl?: string;
}

export interface VideoRenderOutput {
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  sizeMb: number;
  provider: "mock" | "replicate" | "runway";
}

// Task Types
export interface ClaimTaskSuggestion {
  title: string;
  reason: string;
  category: "inspection" | "documentation" | "communication" | "estimation" | "action" | "follow-up";
  priority: "low" | "medium" | "high";
}

// Adjuster Communication Types
export interface AdjusterEmail {
  subject: string;
  bodyText: string;
  watchLink?: string | null;
  address: string;
}

export interface AdjusterPacket {
  propertyBasics: {
    address: string;
    inspectionDate: string;
    claimType: string;
    urgencyScore: number;
  };
  scopeOverview: {
    damageTypes: string[];
    affectedMaterials: string[];
    confidenceLevel: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damageSummary: any;
  urgencyAndSafety: {
    urgencyLevel: "Low" | "Medium" | "High";
    safetyFlags: string[];
    recommendedActions: string[];
  };
  links: {
    videoReport: string | null;
    aiReportPdf: string | null;
  };
}
