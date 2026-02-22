"use client";

import { logger } from "@/lib/logger";
import { useState } from "react";

interface WeatherExportButtonsProps {
  reportId: string;
}

export function WeatherExportButtons({ reportId }: WeatherExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportPacket = async (format: "CLAIMS" | "HOMEOWNER" | "QUICK" | "PA") => {
    setExporting(format);
    try {
      const res = await fetch("/api/weather/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, format }),
      });

      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();

      // Download as JSON
      const blob = new Blob([JSON.stringify(data.packet, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weather-${format.toLowerCase()}-${reportId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`${format} packet exported successfully!`);
    } catch (err) {
      logger.error("Export error:", err);
      alert("Failed to export packet. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async (format: "CLAIMS" | "HOMEOWNER" | "QUICK" | "PA") => {
    setExporting(format + "_PDF");
    try {
      const res = await fetch("/api/weather/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, format }),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Open in new tab AND download
      window.open(url, "_blank");

      const a = document.createElement("a");
      a.href = url;
      a.download = `weather-${format.toLowerCase()}-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`${format} PDF exported successfully!`);
    } catch (err) {
      logger.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const buttons = [
    {
      format: "CLAIMS" as const,
      label: "Claims-Ready Packet",
      icon: "📄",
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Technical, code-heavy, adjuster-focused",
    },
    {
      format: "HOMEOWNER" as const,
      label: "Homeowner Summary",
      icon: "🏡",
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Simple, friendly, sales-ready",
    },
    {
      format: "QUICK" as const,
      label: "Quick Snapshot",
      icon: "⚡",
      color: "bg-purple-600 hover:bg-purple-700",
      description: "One-page internal summary",
    },
    {
      format: "PA" as const,
      label: "Public Adjuster Packet",
      icon: "🏛️",
      color: "bg-red-600 hover:bg-red-700",
      description: "Forensic detail, litigation-ready",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Export Weather Packets</h3>
        <span className="text-xs text-gray-500">JSON + PDF formats</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {buttons.map((btn) => (
          <div key={btn.format} className="space-y-2">
            {/* JSON Export Button */}
            <button
              onClick={() => exportPacket(btn.format)}
              disabled={exporting !== null}
              className={`relative w-full rounded-xl px-4 py-3 font-medium text-white transition-all ${btn.color} ${exporting === btn.format ? "cursor-wait opacity-50" : ""} ${exporting && exporting !== btn.format && !exporting.includes("_PDF") ? "opacity-30" : ""} disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{btn.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">{btn.label}</div>
                  <div className="text-xs opacity-90">{btn.description}</div>
                </div>
                {exporting === btn.format && <div className="animate-spin">⏳</div>}
              </div>
            </button>

            {/* PDF Export Button */}
            <button
              onClick={() => exportPDF(btn.format)}
              disabled={exporting !== null}
              className={`relative w-full rounded-lg border-2 bg-white px-3 py-2 font-medium transition-all ${btn.color.replace("bg-", "border-").replace("hover:bg-", "hover:border-")} ${btn.color.replace("bg-", "text-").replace("hover:bg-", "").split(" ")[0]} ${exporting === btn.format + "_PDF" ? "cursor-wait opacity-50" : ""} ${exporting && exporting !== btn.format + "_PDF" ? "opacity-30" : ""} disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📄 Download PDF</span>
                {exporting === btn.format + "_PDF" && <div className="animate-spin">⏳</div>}
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-xs text-gray-500">
        <p>
          • <strong>Claims-Ready:</strong> Technical language, building codes, manufacturer specs
        </p>
        <p>
          • <strong>Homeowner:</strong> Simple explanations, next steps, safety notes
        </p>
        <p>
          • <strong>Quick Snapshot:</strong> Bullet points, one-page, team reference
        </p>
        <p>
          • <strong>Public Adjuster:</strong> Extreme detail, litigation support, component analysis
        </p>
      </div>
    </div>
  );
}
