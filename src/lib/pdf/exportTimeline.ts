/**
 * PDF Export for Timeline & Claim Summary
 *
 * Generates PDF exports of:
 * - Full timeline with events
 * - Claim summary report
 * - Email-ready adjuster packet
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  createdAt: string;
  createdBy?: string;
}

interface ClaimData {
  claimNumber: string;
  status: string;
  dateOfLoss?: string;
  insured_name?: string;
  propertyAddress?: string;
  estimatedValue?: number;
  approvedValue?: number;
}

interface TimelineNote {
  createdAt: string;
  noteType?: string;
  note: string;
}

export async function exportTimelineToPDF(
  claim: ClaimData,
  timeline: TimelineEvent[],
  notes: TimelineNote[]
): Promise<Blob> {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text("Claim Timeline Report", 14, 20);

  // Claim Details
  doc.setFontSize(12);
  doc.text(`Claim #: ${claim.claimNumber}`, 14, 35);
  doc.text(`Status: ${claim.status}`, 14, 42);
  if (claim.insured_name) {
    doc.text(`Insured: ${claim.insured_name}`, 14, 49);
  }
  if (claim.propertyAddress) {
    doc.text(`Property: ${claim.propertyAddress}`, 14, 56);
  }

  // Timeline Events
  doc.setFontSize(14);
  doc.text("Timeline Events", 14, 70);

  const timelineData = timeline.map((event) => [
    new Date(event.createdAt).toLocaleDateString(),
    event.title,
    event.eventType,
    event.description || "",
  ]);

  autoTable(doc, {
    startY: 75,
    head: [["Date", "Event", "Type", "Description"]],
    body: timelineData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Notes Section
  if (notes.length > 0) {
    const autoTableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    const finalY = (autoTableDoc.lastAutoTable?.finalY ?? 85) + 10;
    doc.setFontSize(14);
    doc.text("Internal Notes", 14, finalY);

    const notesData = notes.map((note) => [
      new Date(note.createdAt).toLocaleDateString(),
      note.noteType || "General",
      note.note,
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Date", "Type", "Note"]],
      body: notesData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  return doc.output("blob");
}

export async function exportClaimSummaryToPDF(
  claim: ClaimData & { description?: string },
  timeline: TimelineEvent[]
): Promise<Blob> {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(24);
  doc.text("Claim Summary", 14, 20);

  // Claim Information
  doc.setFontSize(14);
  doc.text("Claim Information", 14, 35);

  const claimInfo = [
    ["Claim Number", claim.claimNumber],
    ["Status", claim.status],
    ["Date of Loss", claim.dateOfLoss || "N/A"],
    ["Insured Name", claim.insured_name || "N/A"],
    ["Property Address", claim.propertyAddress || "N/A"],
    [
      "Estimated Value",
      claim.estimatedValue ? `$${(claim.estimatedValue / 100).toFixed(2)}` : "N/A",
    ],
    ["Approved Value", claim.approvedValue ? `$${(claim.approvedValue / 100).toFixed(2)}` : "N/A"],
  ];

  autoTable(doc, {
    startY: 40,
    body: claimInfo,
    theme: "plain",
    styles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: 130 },
    },
  });

  // Recent Activity
  const autoTableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const finalY = (autoTableDoc.lastAutoTable?.finalY ?? 55) + 15;
  doc.setFontSize(14);
  doc.text("Recent Activity", 14, finalY);

  const recentEvents = timeline
    .slice(0, 10)
    .map((event) => [new Date(event.createdAt).toLocaleDateString(), event.title, event.eventType]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Date", "Event", "Type"]],
    body: recentEvents,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);

  return doc.output("blob");
}

// Helper to trigger download
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
