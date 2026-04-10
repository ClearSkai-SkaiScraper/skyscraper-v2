"use client";

import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";

interface PdfPreviewModalProps {
  documentUrl: string;
  title?: string;
  open: boolean;
  onClose: () => void;
}

export default function PdfPreviewModal({
  documentUrl,
  title = "Document Preview",
  open,
  onClose,
}: PdfPreviewModalProps) {
  const [zoom, setZoom] = React.useState(100);

  if (!open) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = title || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="text-xl">📄</span>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center text-sm text-gray-600">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="mx-2 h-6 w-px bg-slate-200" />
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div className="mx-auto max-w-4xl bg-white shadow-lg">
            <iframe
              src={documentUrl}
              className="h-[calc(90vh-120px)] w-full"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
              title={title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
