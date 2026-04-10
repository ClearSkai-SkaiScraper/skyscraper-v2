"use client";
import React, { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";

export default function LicensingTab({ orgId }: { orgId?: string }) {
  const [roc, setRoc] = useState("AZ ROC #350304");
  useEffect(() => {
    // TODO: Add roc_number field to org_branding schema if needed
    // (async () => {
    //   if (!orgId) return;
    //   const { data } = await supabase
    //     .from("org_branding")
    //     .select("roc_number")
    //     .eq("org_id", orgId)
    //     .single();
    //   if (data) setRoc(data.roc_number || roc);
    // })();
  }, [orgId]);

  async function save() {
    // TODO: Add roc_number field to org_branding schema if needed
    // await supabase
    //   .from("org_branding")
    //   .upsert({ org_id: orgId, roc_number: roc });
    alert("Saved (local state only - database field not implemented)");
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Legal & Licensing</h2>
      <div className="mt-4">
        <label>ROC Number</label>
        <input value={roc} onChange={(e) => setRoc(e.target.value)} className="input" placeholder="ROC Number" aria-label="ROC Number" />
        <div className="mt-2">Licensed · Bonded · Insured</div>
        <div className="mt-4">
          <Button onClick={save} size="sm" variant="default">Save</Button>
        </div>
      </div>
    </div>
  );
}
