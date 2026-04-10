/**
 * Fallback Content for AI Sections
 * Prevents blank PDFs when AI generation fails
 */

export const FALLBACK_CONTENT = {
  executive_summary: {
    paragraphs: [
      "This report documents the property damage assessment and recommended repairs.",
      "AI content generation is temporarily unavailable. Please review the supporting documentation and evidence sections for detailed information.",
    ],
    tone: "neutral" as const,
    confidence: "low" as const,
  },

  photo_evidence: {
    sections: [],
    totalPhotos: 0,
    confidence: "low" as const,
  },

  scope_matrix: {
    items: [
      {
        category: "General",
        description: "Detailed scope pending review",
        quantity: 0,
        unit: "EA",
        unitPrice: 0,
        total: 0,
      },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    confidence: "low" as const,
  },

  weather_verification: {
    date: new Date().toISOString().split("T")[0],
    location: {
      address: "Property location",
      coordinates: { lat: 0, lon: 0 },
    },
    events: [],
    source: "visual_crossing" as const,
    confidence: "low" as const,
  },

  damage_timeline: {
    events: [
      {
        date: new Date().toISOString().split("T")[0],
        title: "Initial Assessment",
        description: "Timeline pending detailed review",
        category: "inspection" as const,
      },
    ],
    startDate: new Date().toISOString().split("T")[0],
    confidence: "low" as const,
  },

  code_compliance: {
    items: [
      {
        code: "Pending Review",
        description: "Code compliance assessment in progress",
        required: false,
        currentStatus: "upgrade-required" as const,
        recommendation: "Detailed code review pending",
      },
    ],
    jurisdiction: "Local",
    buildingType: "Residential",
    confidence: "low" as const,
  },

  carrier_correspondence: {
    entries: [],
    totalCommunications: 0,
    confidence: "low" as const,
  },

  legal_precedent: {
    cases: [],
    policyLanguage: [],
    confidence: "low" as const,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFallbackContent(sectionKey: string): any {
  return (
    FALLBACK_CONTENT[sectionKey] || {
      error: "Section not found",
      confidence: "low",
    }
  );
}
