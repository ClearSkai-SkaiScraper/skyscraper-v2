/**
 * AI Claims Builder - Enhanced Integration
 *
 * This component extends the existing /reports/builder with:
 * 1. GPT-4o Vision photo analysis
 * 2. Automatic line item generation
 * 3. Line item editor with cost calculations
 * 4. PDF generation with embedded photos
 * 5. Save to claim_builders database table
 *
 * Integration Points:
 * - POST /api/claims/ai/detect - Vision damage detection
 * - POST /api/claims/ai/build - Line item generation
 * - Database: claim_builders table (already exists)
 */

import { Download, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

// Types for damage detection results
export type DamageResult = {
  fileName: string;
  damageTypes: string[];
  confidence?: number;
  photoUrl?: string;
};

// Types for line items
export type LineItem = {
  code: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice?: number;
  total?: number;
};

// State management for AI features
export type AIBuilderState = {
  claimId?: string;
  isAnalyzing: boolean;
  damageResults: DamageResult[];
  lineItems: LineItem[];
  isGeneratingLineItems: boolean;
  isSaving: boolean;
  isGeneratingPDF: boolean;
};

/**
 * Hook for AI Claims Builder functionality
 * Use this in the existing ReportBuilderPage component
 */
export type UseAIClaimsBuilderReturn = {
  aiState: AIBuilderState;
  analyzePhotos: (photos: File[], claimId: string) => Promise<DamageResult[]>;
  generateLineItems: (weatherSummary?: string) => Promise<LineItem[]>;
  updateLineItem: (index: number, field: keyof LineItem, value: unknown) => void;
  addCustomLineItem: () => void;
  removeLineItem: (index: number) => void;
  saveToDatabase: () => Promise<void>;
  generatePDF: (propertyAddress?: string, clientName?: string) => Promise<void>;
};

export function useAIClaimsBuilder(): UseAIClaimsBuilderReturn {
  const [aiState, setAIState] = useState<AIBuilderState>({
    isAnalyzing: false,
    damageResults: [],
    lineItems: [],
    isGeneratingLineItems: false,
    isSaving: false,
    isGeneratingPDF: false,
  });

  /**
   * Step 1: Analyze uploaded photos with GPT-4o Vision
   * Call this after user uploads damage photos
   */
  const analyzePhotos = async (photos: File[], claimId: string): Promise<DamageResult[]> => {
    setAIState({ ...aiState, isAnalyzing: true, claimId });

    try {
      const formData = new FormData();
      photos.forEach((photo) => formData.append("photos", photo));
      formData.append("claimId", claimId);

      const response = await fetch("/api/claims/ai/detect", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze photos");
      }

      const { results } = await response.json();

      setAIState({
        ...aiState,
        isAnalyzing: false,
        damageResults: results,
        claimId,
      });

      return results;
    } catch (error) {
      logger.error("Photo analysis error:", error);
      setAIState({ ...aiState, isAnalyzing: false });
      throw error;
    }
  };

  /**
   * Step 2: Generate line items from damage detection results
   * Call this after damage analysis completes
   */
  const generateLineItems = async (weatherSummary?: string): Promise<LineItem[]> => {
    if (!aiState.claimId || aiState.damageResults.length === 0) {
      throw new Error("No damage results to generate line items from");
    }

    setAIState({ ...aiState, isGeneratingLineItems: true });

    try {
      const response = await fetch("/api/claims/ai/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: aiState.claimId,
          damageLabels: aiState.damageResults,
          weather: { summary: weatherSummary || "Weather data not available" },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate line items");
      }

      const { lineItems } = await response.json();

      setAIState({
        ...aiState,
        isGeneratingLineItems: false,
        lineItems,
      });

      return lineItems;
    } catch (error) {
      logger.error("Line item generation error:", error);
      setAIState({ ...aiState, isGeneratingLineItems: false });
      throw error;
    }
  };

  /**
   * Step 3: Update a specific line item
   * Use for the line item editor UI
   */
  const updateLineItem = (index: number, field: keyof LineItem, value: unknown): void => {
    const updated = [...aiState.lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total if qty or unitPrice changed
    if ((field === "qty" || field === "unitPrice") && updated[index].unitPrice) {
      updated[index].total = updated[index].qty * (updated[index].unitPrice || 0);
    }

    setAIState({ ...aiState, lineItems: updated });
  };

  /**
   * Step 4: Add a custom line item
   */
  const addCustomLineItem = (): void => {
    const newItem: LineItem = {
      code: "CUSTOM",
      description: "Custom line item",
      qty: 1,
      unit: "EA",
      unitPrice: 0,
      total: 0,
    };

    setAIState({
      ...aiState,
      lineItems: [...aiState.lineItems, newItem],
    });
  };

  /**
   * Step 5: Remove a line item
   */
  const removeLineItem = (index: number): void => {
    const updated = aiState.lineItems.filter((_, i) => i !== index);
    setAIState({ ...aiState, lineItems: updated });
  };

  /**
   * Step 6: Save to database (claim_builders table)
   * This is already implemented in /api/claims/ai/build
   */
  const saveToDatabase = async (): Promise<void> => {
    if (!aiState.claimId) {
      throw new Error("No claim ID to save to");
    }

    setAIState({ ...aiState, isSaving: true });

    try {
      // The /api/claims/ai/build endpoint already handles upsert to claim_builders
      await fetch("/api/claims/ai/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: aiState.claimId,
          damageLabels: aiState.damageResults,
          weather: { summary: "Saved from Claims Builder" },
        }),
      });

      setAIState({ ...aiState, isSaving: false });
    } catch (error) {
      logger.error("Save error:", error);
      setAIState({ ...aiState, isSaving: false });
      throw error;
    }
  };

  /**
   * Step 7: Generate PDF report via server route (returns JSON with public URL)
   */
  const generatePDF = async (propertyAddress?: string, clientName?: string): Promise<void> => {
    if (!aiState.claimId) {
      throw new Error("No claim ID to generate PDF for");
    }

    setAIState({ ...aiState, isGeneratingPDF: true });

    try {
      const response = await fetch(`/api/reports/claims/${aiState.claimId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: aiState.lineItems,
          photos: aiState.damageResults.map((r) => r.fileName),
          propertyAddress,
          clientName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Expect JSON { url: publicUrl }
      const { url } = await response.json();
      if (url) {
        window.open(url, "_blank");
        // Fire-and-forget history recording with persistent storage URL
        try {
          void fetch("/api/reports/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "claim_pdf",
              sourceId: aiState.claimId,
              title: `AI Claim PDF ${new Date().toLocaleDateString()}`,
              fileUrl: url,
              metadata: { lineItemCount: aiState.lineItems.length },
            }),
          });
        } catch {}
      }

      setAIState({ ...aiState, isGeneratingPDF: false });
    } catch (error) {
      logger.error("PDF generation error:", error);
      setAIState({ ...aiState, isGeneratingPDF: false });
      throw error;
    }
  };

  return {
    aiState,
    analyzePhotos,
    generateLineItems,
    updateLineItem,
    addCustomLineItem,
    removeLineItem,
    saveToDatabase,
    generatePDF,
  };
}

/**
 * Damage Results Display Component
 * Shows AI-detected damage types from photo analysis
 */
export function DamageResultsDisplay({ results }: { results: DamageResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-900/20">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          AI Damage Detection Results
        </h3>
      </div>
      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className="rounded-lg bg-white p-4 dark:bg-slate-800">
            <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">
              📷 {result.fileName}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.damageTypes.map((type, j) => (
                <span
                  key={j}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  {type}
                </span>
              ))}
            </div>
            {result.confidence && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Line Item Editor Component
 * Editable table for adjusting quantities, descriptions, and costs
 */
export function LineItemEditor({
  lineItems,
  onUpdate,
  onRemove,
  onAddCustom,
}: {
  lineItems: LineItem[];
  onUpdate: (index: number, field: keyof LineItem, value: any) => void;
  onRemove: (index: number) => void;
  onAddCustom: () => void;
}) {
  if (lineItems.length === 0) return null;

  const totalCost = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Line Items Editor
        </h3>
        <button
          onClick={onAddCustom}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Custom Item
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Code</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                Description
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Qty</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Unit</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Unit $</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Total</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {lineItems.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{item.code}</td>
                <td className="px-4 py-3">
                  <input
                    aria-label="Line item description"
                    placeholder="Description"
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdate(i, "description", e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label="Quantity"
                    placeholder="Qty"
                    type="number"
                    value={item.qty}
                    onChange={(e) => onUpdate(i, "qty", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    min="0"
                    step="0.1"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label="Unit"
                    value={item.unit}
                    onChange={(e) => onUpdate(i, "unit", e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="SQ">SQ</option>
                    <option value="LF">LF</option>
                    <option value="EA">EA</option>
                    <option value="SF">SF</option>
                    <option value="HR">HR</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label="Unit price"
                    placeholder="Unit $"
                    type="number"
                    value={item.unitPrice || 0}
                    onChange={(e) => onUpdate(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  ${(item.total || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onRemove(i)}
                    className="rounded-lg bg-red-100 p-2 text-red-600 transition hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    title="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
            <tr>
              <td
                colSpan={5}
                className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100"
              >
                Total Estimate:
              </td>
              <td className="px-4 py-3 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                ${totalCost.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/**
 * AI Analysis Button Component
 * Triggers photo analysis with loading state
 */
export function AnalyzePhotosButton({
  photos,
  claimId,
  isAnalyzing,
  onAnalyze,
}: {
  photos: File[];
  claimId: string;
  isAnalyzing: boolean;
  onAnalyze: (photos: File[], claimId: string) => Promise<any>;
}) {
  return (
    <button
      onClick={() => onAnalyze(photos, claimId)}
      disabled={isAnalyzing || photos.length === 0}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-indigo px-6 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Analyzing with AI...
        </>
      ) : (
        <>
          <Sparkles className="h-5 w-5" />
          Analyze Damage with AI
        </>
      )}
    </button>
  );
}

/**
 * Action Buttons Component
 * Generate PDF, Save to DB, Export options
 */
export function AIBuilderActions({
  onGeneratePDF,
  onSave,
  isGeneratingPDF,
  isSaving,
  disabled,
}: {
  onGeneratePDF: () => Promise<void>;
  onSave: () => Promise<void>;
  isGeneratingPDF: boolean;
  isSaving: boolean;
  disabled: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-4">
      <button
        onClick={onGeneratePDF}
        disabled={disabled || isGeneratingPDF}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGeneratingPDF ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Generate PDF Report
          </>
        )}
      </button>

      <button
        onClick={onSave}
        disabled={disabled || isSaving}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            Save to Database
          </>
        )}
      </button>
    </div>
  );
}
