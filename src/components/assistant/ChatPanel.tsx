"use client";

// Legacy ChatPanel fully retired. Preserve a lightweight prop interface so existing
// imports / usages do not cause TypeScript errors. All behavior removed.

export interface ChatPanelProps {
  onSendToReport?: (text: string) => void;
  onSendToReportHtml?: (html: string) => void;
  onExport?: (mode: "inspection" | "insurance" | "retail") => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddCitation?: (citation: any) => void; // Citation type deprecated here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  citations?: any[];
  mode?: "inspection" | "insurance" | "retail";
}

export default function ChatPanel(_props: ChatPanelProps) {
  return null; // Render nothing; legacy assistant UI removed.
}
