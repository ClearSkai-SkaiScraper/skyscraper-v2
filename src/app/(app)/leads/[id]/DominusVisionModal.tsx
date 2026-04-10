"use client";

import { AlertCircle, Copy, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ImageAnalysis {
  damageTypes: string[];
  severity: string;
  flags: string[];
  notes: string;
  confidence: number;
  imageUrl: string;
}

interface DominusVisionModalProps {
  image: ImageAnalysis;
  onClose: () => void;
  leadId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DominusVisionModal({ image, onClose, leadId }: DominusVisionModalProps) {
  const [regenerating, setRegenerating] = useState(false);

  const copyToClipboard = () => {
    const text = `
Damage Types: ${image.damageTypes.join(", ")}
Severity: ${image.severity}
Confidence: ${image.confidence}%
Flags: ${image.flags.join(", ")}

Notes:
${image.notes}
    `.trim();

    void navigator.clipboard.writeText(text);
    toast.success("Analysis copied to clipboard");
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    toast("Running vision analysis again...");

    try {
      const res = await fetch("/api/ai/skai/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: [image.imageUrl] }),
      });

      if (res.ok) {
        toast.success("Vision analysis regenerated");
        // Optionally reload the parent component
        onClose();
      } else {
        toast.error("Regeneration failed");
        setRegenerating(false);
        return;
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      toast.error("Failed to regenerate analysis");
    } finally {
      setRegenerating(false);
    }
  };

  const getSeverityColor = () => {
    switch (image.severity?.toLowerCase()) {
      case "high":
      case "severe":
        return "text-red-600 bg-red-50";
      case "medium":
      case "moderate":
        return "text-yellow-600 bg-yellow-50";
      case "low":
      case "minor":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4 dark:bg-neutral-900">
          <h2 className="text-xl font-bold">Vision Analysis</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </div>

        // eslint-disable-next-line react/jsx-no-comment-textnodes
        {/* Image Preview */}
        // eslint-disable-next-line @next/next/no-img-element
        <div className="p-4">
          <img src={image.imageUrl} alt="Analysis" className="w-full rounded-lg border" />
        </div>

        {/* Analysis Details */}
        <div className="space-y-4 p-4">
          {/* Damage Types */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Damage Types</h3>
            <div className="flex flex-wrap gap-2">
              {image.damageTypes && image.damageTypes.length > 0 ? (
                image.damageTypes.map((type, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700"
                  >
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No damage types identified</span>
              )}
            </div>
          </div>

          {/* Severity */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Severity</h3>
            <span
              className={`inline-block rounded-lg px-3 py-1 text-sm font-semibold ${getSeverityColor()}`}
            >
              {image.severity || "Not assessed"}
            </span>
          </div>

          {/* Confidence */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Confidence Score</h3>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full bg-purple-600 ${
                    image.confidence >= 75
                      ? "w-3/4"
                      : image.confidence >= 50
                        ? "w-1/2"
                        : image.confidence >= 25
                          ? "w-1/4"
                          : "w-1/12"
                  }`}
                />
              </div>
              <span className="text-sm font-semibold text-purple-600">{image.confidence}%</span>
            </div>
          </div>

          {/* Flags */}
          {image.flags && image.flags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Flags</h3>
              <ul className="space-y-2">
                {image.flags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Analysis Notes</h3>
            <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              {image.notes || "No additional notes"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex gap-2 border-t bg-white p-4 dark:bg-neutral-900">
          <Button onClick={copyToClipboard} variant="outline" className="flex-1">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            variant="outline"
            className="flex-1"
          >
            {regenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
