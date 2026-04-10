"use client";

import { ChevronDown, ChevronUp, FileCode2, Layers, Zap } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TemplateIntelligenceProps {
  templateSlug: string;
  hasHtml: boolean;
  previewReady: boolean;
  generateReady: boolean;
  batchReady: boolean;
  aiEnriched: boolean;
  intendedUse: string | null;
  // Updated types to match new schema
  requiredData: Record<string, string[]> | null; // { claim: ["claimNumber", "dateOfLoss"], property: [...] }
  autoFillMap: Record<string, string> | null; // { "{{FIELD}}": "path.to.data" }
  isPreview?: boolean;
}

export function TemplateIntelligencePanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  templateSlug,
  hasHtml,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  previewReady,
  generateReady,
  batchReady,
  aiEnriched,
  intendedUse,
  requiredData,
  autoFillMap,
  isPreview = true,
}: TemplateIntelligenceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">How This Template Works</CardTitle>
          </div>
          <button className="text-blue-600 hover:text-blue-800">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
        <CardDescription>
          {isPreview
            ? "Preview mode — Showing neutral placeholders"
            : "Production mode — Real claim data"}
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Template Capabilities */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-yellow-600" />
              Template Capabilities
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
              <div
                className={`rounded px-2 py-1 ${
                  hasHtml
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {hasHtml ? "✓" : "✗"} HTML Template
              </div>
              <div
                className={`rounded px-2 py-1 ${
                  generateReady
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {generateReady ? "✓" : "✗"} PDF Generation
              </div>
              <div
                className={`rounded px-2 py-1 ${
                  batchReady
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {batchReady ? "✓" : "✗"} Batch Ready
              </div>
              <div
                className={`rounded px-2 py-1 ${
                  aiEnriched
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {aiEnriched ? "✓" : "✗"} AI Enriched
              </div>
              <div className="rounded bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {intendedUse || "General"}
              </div>
            </div>
          </div>

          {/* Intended Use */}
          {intendedUse && (
            <div className="rounded border border-blue-200 bg-white p-3 dark:border-blue-800 dark:bg-gray-900">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                <strong className="text-blue-600 dark:text-blue-400">Purpose:</strong> {intendedUse}
              </p>
            </div>
          )}

          {/* Required Data */}
          {requiredData && Object.keys(requiredData).length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-blue-600" />
                Required Data Categories
              </h4>
              <div className="space-y-2">
                {Object.entries(requiredData).map(([category, fields]) => (
                  <div key={category} className="rounded bg-orange-50 p-2 dark:bg-orange-900/20">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                      {category}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.map((field) => (
                        <span
                          key={field}
                          className="rounded bg-white px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Fill Map */}
          {autoFillMap && Object.keys(autoFillMap).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Auto-Fill Placeholders ({Object.keys(autoFillMap).length})
              </h4>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded bg-purple-50 p-3 dark:bg-purple-900/20">
                {Object.entries(autoFillMap)
                  .slice(0, 8)
                  .map(([placeholder, dataPath]) => (
                    <div key={placeholder} className="flex items-center gap-2 text-xs">
                      <code className="flex-shrink-0 rounded bg-white px-2 py-1 font-mono text-purple-700 dark:bg-gray-900 dark:text-purple-300">
                        {placeholder}
                      </code>
                      <span className="text-gray-400">→</span>
                      <code className="truncate font-mono text-gray-600 dark:text-gray-400">
                        {dataPath}
                      </code>
                    </div>
                  ))}
                {Object.keys(autoFillMap).length > 8 && (
                  <p className="pt-1 text-xs italic text-gray-500 dark:text-gray-400">
                    + {Object.keys(autoFillMap).length - 8} more placeholders
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Mode Badge */}
          {isPreview && (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                <strong>Preview Mode:</strong> This template shows neutral placeholders. When you
                generate it from a claim, it will use your organization&apos;s branding, claim data, and
                property information automatically.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
