// src/components/weather/WeatherControls.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useWeather } from "@/hooks/useWeather";

import { PDFPreviewModal } from "./PDFPreviewModal";

export type WeatherControlsProps = {
  lat: number;
  lon: number;
  orgId: string;
  propertyId?: string;
};

export function WeatherControls({ lat, lon, orgId, propertyId }: WeatherControlsProps) {
  const { loading, error, dol, pdfUrl, pullQuickDol, generatePdf } = useWeather();
  const [showPreview, setShowPreview] = useState(false);

  const handlePullDol = async () => {
    try {
      const res = await fetch("/api/weather/quick-dol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, orgId, daysBack: 365 }),
      });
      const json = await res.json();

      if (res.status === 402) {
        // Insufficient tokens - redirect to purchase
        const checkoutRes = await fetch(
          `/api/billing/tokens/checkout?orgId=${encodeURIComponent(orgId)}&sku=token_pack_100`
        );
        const { url } = await checkoutRes.json();
        window.location.href = url;
        return;
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Quick DOL failed");
      }

      await pullQuickDol(lat, lon);
      toast.success("Success", {
        description: "Quick DOL pulled successfully (365-day scan)",
      });
    } catch (_err) {
      toast.error("Error", {
        description: error || "Failed to pull Quick DOL",
      });
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await generatePdf(lat, lon, orgId, propertyId);
      toast.success("Success", {
        description: "PDF generated successfully",
      });
    } catch (_err) {
      toast.error("Error", {
        description: error || "Failed to generate PDF",
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={handlePullDol}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Pull Quick DOL · 100 tokens"}
        </button>
        <button
          onClick={handleGeneratePdf}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Generate Weather PDF"}
        </button>
        {pdfUrl && (
          <button
            onClick={() => setShowPreview(true)}
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Open PDF Preview
          </button>
        )}
      </div>

      {dol && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
          <strong>Quick DOL:</strong> {dol.recommended_date || "N/A"} ({dol.confidence}% confidence)
          {!dol.recommended_date && (
            <span className="ml-2 rounded bg-yellow-200 px-2 py-1 text-xs text-yellow-800">
              No weather data
            </span>
          )}
        </div>
      )}

      {showPreview && pdfUrl && (
        <PDFPreviewModal pdfUrl={pdfUrl} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
