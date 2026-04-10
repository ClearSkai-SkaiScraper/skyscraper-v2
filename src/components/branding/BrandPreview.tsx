import React from "react";

import DefaultBrand from "@/config/brandingDefaults";

export default function BrandPreview() {
  const b = DefaultBrand;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16 }}>
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/branding/${b.org_id}/logo.svg`} alt="logo" style={{ height: 64 }} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{b.company_name}</div>
        <div style={{ color: "#666" }}>{b.tagline}</div>
        <div style={{ marginTop: 8 }}>
          {b.contact_name} • {b.title}
        </div>
        <div>
          {b.phone} • {b.email}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>
          {b.service_area} • {b.roc}
        </div>
      </div>
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/branding/${b.org_id}/headshot.svg`}
        alt="headshot"
        style={{ marginLeft: "auto", height: 64, borderRadius: 8 }}
      />
    </div>
  );
}
