"use client";

import React from "react";

import { ClaimsGrid } from "@/components/claims/ClaimsGrid";

type ClaimsWorkspaceClientProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialClaims?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export default function ClaimsWorkspaceClient(props: ClaimsWorkspaceClientProps) {
  const { initialClaims = [] } = props;

  return (
    <div className="mt-8">
      {/* Claims Grid */}
      <ClaimsGrid claims={initialClaims} />
    </div>
  );
}
