/**
 * PDF BRANDING UTILITIES
 * Helper functions for injecting branding into PDF documents
 */

import type { jsPDF } from "jspdf";

export type PDFBrandingConfig = {
  logo: string | null;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  primaryColor: string;
  secondaryColor: string;
};

/**
 * Generate HTML header markup for PDF with branding
 */
export function generatePDFHeader(config: PDFBrandingConfig): string {
  const { logo, businessName, phone, email, website, license, primaryColor } = config;

  return `
    <div style="display: flex; padding: 20px 30px; border-bottom: 4px solid ${primaryColor}; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <div>
        ${
          logo
            ? `<img src="${logo}" alt="${businessName}" style="height: 60px; max-width: 200px; object-fit: contain;" />`
            : `<h1 style="margin: 0; font-size: 24px; font-weight: bold;">${businessName}</h1>`
        }
      </div>
      <div style="text-align: right; font-size: 12px; line-height: 1.6; color: #333;">
        <div style="font-weight: bold; margin-bottom: 4px;">${businessName}</div>
        ${phone ? `<div style="margin-bottom: 2px;">📞 ${phone}</div>` : ""}
        ${email ? `<div style="margin-bottom: 2px;">✉️ ${email}</div>` : ""}
        ${website ? `<div style="margin-bottom: 2px;">🌐 ${website}</div>` : ""}
        ${license ? `<div style="margin-top: 4px; font-size: 10px; color: #666;">License: ${license}</div>` : ""}
      </div>
    </div>
  `;
}

/**
 * Generate HTML footer markup for PDF with branding
 */
export function generatePDFFooter(
  config: PDFBrandingConfig,
  pageNumber?: number,
  totalPages?: number
): string {
  const { businessName, phone, email, website, primaryColor } = config;

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; border-top: 2px solid ${primaryColor}; font-size: 10px; color: #666; margin-top: auto;">
      <div>
        <div style="font-weight: bold; margin-bottom: 2px;">${businessName}</div>
        <div>
          ${phone ? `<span style="margin-right: 10px;">${phone}</span>` : ""}
          ${email ? `<span style="margin-right: 10px;">${email}</span>` : ""}
          ${website ? `<span>${website}</span>` : ""}
        </div>
      </div>
      ${pageNumber && totalPages ? `<div>Page ${pageNumber} of ${totalPages}</div>` : ""}
    </div>
  `;
}

/**
 * Apply branding colors to jsPDF document
 */
export function applyBrandingToJsPDF(
  doc: jsPDF & { __branding?: PDFBrandingConfig },
  config: PDFBrandingConfig
) {
  // Store branding colors for use throughout document
  doc.__branding = config;

  return {
    primaryRgb: hexToRgb(config.primaryColor),
    secondaryRgb: hexToRgb(config.secondaryColor),
  };
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 10, g: 26, b: 47 }; // Default dark blue
}
