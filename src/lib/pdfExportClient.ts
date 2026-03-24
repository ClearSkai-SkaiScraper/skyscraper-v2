import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Export a DOM element as PDF using html2canvas + jsPDF
 */
export async function exportPdfFromHtml(container: HTMLElement, filename = "report.pdf") {
  const canvas = await html2canvas(container, {
    useCORS: true,
    allowTaint: false,
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;

  pdf.addImage(imgData, "JPEG", (pageWidth - w) / 2, 24, w, h);
  pdf.save(filename);
}

/**
 * Hook for off-screen rendering (avoids layout thrashing)
 */
import { useEffect, useRef } from "react";

export function useOffscreen() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.position = "fixed";
    ref.current.style.left = "-99999px";
    ref.current.style.top = "0";
    ref.current.style.width = "794px"; // A4 width @ 96dpi
  }, []);
  return ref;
}

/**
 * Image inlining + cache (reduces network stalls)
 */
const imageCache = new Map<string, string>();

export async function inlineImage(url: string): Promise<string> {
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    imageCache.set(url, data);
    return data;
  } catch (error) {
    console.error("[PDF_EXPORT] Failed to inline image", { url, error });
    return url; // fallback to original URL
  }
}
