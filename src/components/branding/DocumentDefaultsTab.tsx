"use client";
import React from "react";

import CoverForm from "@/components/report/CoverForm";

export default function DocumentDefaultsTab() {
  // This tab just reuses CoverForm as the defaults editor for now
  // In the real UI we'd show a compact defaults form; for speed reuse existing component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (typeof window !== "undefined" && (window as any).__ORG_ID__) || "";
  return (
    <div>
      <h2 className="text-lg font-semibold">Document Defaults</h2>
      <div className="mt-4">
        <CoverForm orgId={orgId} />
      </div>
    </div>
  );
}
