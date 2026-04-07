/**
 * PDF Annotations Utility
 * Draws damage annotations (circles, callouts) on PDF pages
 */

import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";

export interface AnnotationCoordinate {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number;
  height: number;
}

export interface DamageAnnotation {
  id: string;
  label: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  boundingBox: AnnotationCoordinate;
  description?: string;
}

export interface AnnotationStyle {
  strokeWidth: number;
  fontSize: number;
  showLabels: boolean;
  showCallouts: boolean;
}

const SEVERITY_COLORS = {
  low: rgb(0.133, 0.773, 0.369), // Green
  medium: rgb(0.918, 0.702, 0.031), // Yellow
  high: rgb(0.976, 0.451, 0.086), // Orange
  critical: rgb(0.937, 0.267, 0.267), // Red
};

const DEFAULT_STYLE: AnnotationStyle = {
  strokeWidth: 2,
  fontSize: 10,
  showLabels: true,
  showCallouts: true,
};

/**
 * Draw damage annotations on a PDF page
 */
export async function drawAnnotationsOnPage(
  page: PDFPage,
  annotations: DamageAnnotation[],
  style: Partial<AnnotationStyle> = {}
): Promise<void> {
  const { width, height } = page.getSize();
  const mergedStyle = { ...DEFAULT_STYLE, ...style };

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const color = SEVERITY_COLORS[annotation.severity];

    // Convert normalized coordinates to page coordinates
    const centerX = annotation.boundingBox.x * width + (annotation.boundingBox.width * width) / 2;
    const centerY =
      height - (annotation.boundingBox.y * height + (annotation.boundingBox.height * height) / 2);
    const radiusX = (annotation.boundingBox.width * width) / 2;
    const radiusY = (annotation.boundingBox.height * height) / 2;

    // Draw ellipse/circle around damage area
    drawEllipse(page, centerX, centerY, radiusX, radiusY, color, mergedStyle.strokeWidth);

    // Draw numbered callout
    if (mergedStyle.showCallouts) {
      const calloutRadius = 12;
      const calloutX = centerX + radiusX + 5;
      const calloutY = centerY + radiusY + 5;

      // Draw callout circle
      page.drawCircle({
        x: calloutX,
        y: calloutY,
        size: calloutRadius,
        color: color,
        borderWidth: 0,
      });

      // Draw number
      page.drawText(String(i + 1), {
        x: calloutX - 4,
        y: calloutY - 4,
        size: mergedStyle.fontSize,
        color: rgb(1, 1, 1),
      });
    }
  }
}

/**
 * Draw an ellipse (approximated with bezier curves)
 */
function drawEllipse(
  page: PDFPage,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: ReturnType<typeof rgb>,
  strokeWidth: number
): void {
  // Approximate ellipse with 4 bezier curves
  const kappa = 0.5522848;
  // Note: ox/oy would be used for proper bezier ellipse approximation
  // but we're using circle approximation for simplicity
  const _ox = rx * kappa;
  const _oy = ry * kappa;

  // Since pdf-lib doesn't have native ellipse, draw 4 arcs
  // For simplicity, draw as a circle with the average radius
  const avgRadius = (rx + ry) / 2;

  page.drawCircle({
    x: cx,
    y: cy,
    size: avgRadius,
    borderColor: color,
    borderWidth: strokeWidth,
    opacity: 0.8,
  });
}

/**
 * Add annotation legend to a PDF page
 */
export async function addAnnotationLegend(
  page: PDFPage,
  annotations: DamageAnnotation[],
  startX: number,
  startY: number
): Promise<void> {
  const font = await page.doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await page.doc.embedFont(StandardFonts.HelveticaBold);

  let y = startY;
  const lineHeight = 14;

  // Title
  page.drawText("Damage Annotations", {
    x: startX,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 1.5;

  // List each annotation
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const color = SEVERITY_COLORS[annotation.severity];

    // Draw colored circle
    page.drawCircle({
      x: startX + 6,
      y: y + 4,
      size: 5,
      color: color,
    });

    // Draw label
    page.drawText(`${i + 1}. ${annotation.label}`, {
      x: startX + 16,
      y,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Draw severity
    page.drawText(`(${annotation.severity})`, {
      x: startX + 200,
      y,
      size: 9,
      font: font,
      color: color,
    });

    y -= lineHeight;

    // Draw description if available
    if (annotation.description) {
      page.drawText(annotation.description, {
        x: startX + 16,
        y,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
        maxWidth: 300,
      });
      y -= lineHeight;
    }
  }
}

/**
 * Create a new PDF with photo and annotations
 */
export async function createAnnotatedPhotoPdf(
  photoBytes: Uint8Array,
  annotations: DamageAnnotation[],
  title: string = "Damage Assessment"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Embed the image
  let image: Awaited<ReturnType<typeof pdfDoc.embedJpg>>;
  try {
    image = await pdfDoc.embedJpg(photoBytes);
  } catch {
    try {
      image = await pdfDoc.embedPng(photoBytes);
    } catch {
      throw new Error("Unsupported image format. Use JPG or PNG.");
    }
  }

  // Create page with image dimensions (max 8.5x11 at 72 DPI)
  const maxWidth = 612;
  const maxHeight = 792;
  const imgWidth = image.width as number;
  const imgHeight = image.height as number;
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
  const width = imgWidth * scale;
  const height = imgHeight * scale;

  const page = pdfDoc.addPage([width, height + 150]); // Extra space for legend

  // Draw image
  page.drawImage(image, {
    x: 0,
    y: 150,
    width,
    height,
  });

  // Draw annotations on the image area
  // Adjust annotation coordinates to image position
  const adjustedAnnotations = annotations.map((a) => ({
    ...a,
    boundingBox: {
      ...a.boundingBox,
      y: a.boundingBox.y + 150 / (height + 150),
    },
  }));

  await drawAnnotationsOnPage(page, adjustedAnnotations);

  // Add legend below image
  await addAnnotationLegend(page, annotations, 20, 130);

  // Add title
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, {
    x: 20,
    y: height + 130,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  return pdfDoc.save();
}

/**
 * Generate SVG overlay for web display
 */
export function generateSvgOverlay(
  annotations: DamageAnnotation[],
  width: number = 100,
  height: number = 100
): string {
  const elements = annotations.map((a, i) => {
    const cx = (a.boundingBox.x + a.boundingBox.width / 2) * width;
    const cy = (a.boundingBox.y + a.boundingBox.height / 2) * height;
    const rx = (a.boundingBox.width / 2) * width;
    const ry = (a.boundingBox.height / 2) * height;

    const colors: Record<string, string> = {
      low: "#22c55e",
      medium: "#eab308",
      high: "#f97316",
      critical: "#ef4444",
    };
    const color = colors[a.severity];

    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" 
               fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>
      <circle cx="${cx + rx + 5}" cy="${cy - ry - 5}" r="10" fill="${color}"/>
      <text x="${cx + rx + 5}" y="${cy - ry - 1}" 
            text-anchor="middle" fill="white" font-size="10" font-weight="bold">${i + 1}</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    ${elements.join("\n")}
  </svg>`;
}
