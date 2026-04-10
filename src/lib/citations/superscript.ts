/**
 * Build superscripted summary with inline citation markers
 */
import type { Citation } from "@/lib/citations";

const SUP = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰"];

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ch) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as any)[ch]
  );
}

export function buildSuperscriptedSummary(text: string, citations: Citation[]): string {
  const clean = (text || "").trim();
  if (!clean) return "";

  const cits = citations || [];
  const sentences = clean.split(/([.!?]+\s+)/); // keep delimiters

  let html = "";
  let sidx = 0;
  let cidx = 0;

  while (sidx < sentences.length) {
    const s = sentences[sidx++] || "";
    const d = sentences[sidx] || "";
    if (d) sidx++; // consume delimiter

    html += escapeHtml(s);
    if (d) html += escapeHtml(d);

    if (cidx < cits.length) {
      const num = cidx + 1;
      const badge = SUP[cidx] || `[${num}]`;
      html += `<sup class="cs-foot">${badge}</sup>`;
      cidx++;
    }
  }

  // Append remaining citations if we have more citations than sentences
  if (cidx < cits.length) {
    const rest = cits
      .slice(cidx)
      .map((_, i) => SUP[cidx + i] || `[${cidx + i + 1}]`)
      .join("");
    html += ` <sup class="cs-foot">${rest}</sup>`;
  }

  return html;
}
