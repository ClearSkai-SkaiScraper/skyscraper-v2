"use client";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export default function LogosTab({ orgId }: { orgId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branding, setBranding] = useState<any>(null);
  useEffect(() => {
    void (async () => {
      if (!orgId) return;
      const { data } = await supabase.from("org_branding").select("*").eq("org_id", orgId).single();
      setBranding(data);
    })();
  }, [orgId]);

  async function uploadLogo(file: File, key = "logo_url") {
    if (!orgId) return;
    const path = `${orgId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, file, { cacheControl: "3600", upsert: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((e: any) => ({ error: e }));
    if (error) return alert("Upload failed");
    const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
    const publicURL = urlData.publicUrl;
    await supabase.from("org_branding").upsert({ org_id: orgId, [key]: publicURL });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBranding((b: any) => ({ ...b, [key]: publicURL }));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Logos</h2>
      <div className="mt-4">
        <div>SkaiScraper™ Logo (static)</div>
        <div className="mt-2">Company Co-Logo (co-brand)</div>
        <input
          type="file"
          aria-label="Upload company logo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadLogo(f, "secondary_logo_url");
          }}
        />
        <div className="mt-4">Current co-logo:</div>
        {branding?.secondary_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.secondary_logo_url} alt="Co logo" className="max-w-[200px]" />
        ) : (
          <div className="border p-6">Your Company Logo Here</div>
        )}
      </div>
    </div>
  );
}
