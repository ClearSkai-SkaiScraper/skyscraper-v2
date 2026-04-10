// src/lib/report-engine/collectors/addons.ts

/**
 * USER ADD-ON SELECTOR COLLECTOR
 * These are the toggles the user chooses in the UI
 * They control what gets included in the final report/proposal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function collectAddonSelections(addonPayload: any) {
  return {
    // Weather & climate
    includeWeather: addonPayload.includeWeather ?? false,
    
    // Code & compliance
    includeCodeCitations: addonPayload.includeCodeCitations ?? false,
    includeManufacturerSpecs: addonPayload.includeManufacturerSpecs ?? false,
    
    // Visual documentation
    includePhotoDocumentation: addonPayload.includePhotoDocumentation ?? false,
    includeColorBoards: addonPayload.includeColorBoards ?? false,
    
    // Analysis & findings
    includeMissingItemsSummary: addonPayload.includeMissingItemsSummary ?? false,
    includeInspectionNotes: addonPayload.includeInspectionNotes ?? false,
    includeSafetyNotes: addonPayload.includeSafetyNotes ?? false,
    
    // Financial breakdowns
    includeFinancialBreakdown: addonPayload.includeFinancialBreakdown ?? true,
    includeMaterialBreakdown: addonPayload.includeMaterialBreakdown ?? false,
    
    // Retail/homeowner options
    includeRetailOptions: addonPayload.includeRetailOptions ?? false,
    includeGoodBetterBest: addonPayload.includeGoodBetterBest ?? false,
    includeWarrantyInfo: addonPayload.includeWarrantyInfo ?? false,
    
    // Metadata
    selectedAt: new Date().toISOString(),
  };
}
