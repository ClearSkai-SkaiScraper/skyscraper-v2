"use client";

import { useEffect, useState } from "react";

type Profile = {
  company_name?: string;
  phone?: string;
  email?: string;
  license_no?: string;
  brand_color?: string;
  accent_color?: string;
  logo_url?: string;
  is_complete?: boolean;
};

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Profile>({ brand_color: "#117CFF", accent_color: "#FFC838" });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/branding");
      if (res.ok) {
        const json = await res.json();
        if (json.profile) setP(json.profile);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    setSaving(false);
    if (!res.ok) return alert("Save failed");
    alert("Branding saved");
  };

  if (loading) return <main className="p-6">Loading…</main>;

  const input = (label: string, name: keyof Profile, type = "text") => (
    <label className="block" key={name}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={(p[name] as string) ?? ""}
        onChange={(e) => setP((prev) => ({ ...prev, [name]: e.target.value }))}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Company Branding</h1>
      <div className="grid gap-4">
        {input("Company Name", "company_name")}
        {input("Phone", "phone")}
        {input("Email", "email")}
        {input("License #", "license_no")}
        <div className="grid grid-cols-2 gap-4">
          {input("Brand Color", "brand_color")}
          {input("Accent Color", "accent_color")}
        </div>
        <label className="block">
          <span className="text-sm text-muted-foreground">Logo URL</span>
          <input
            type="url"
            value={p.logo_url ?? ""}
            onChange={(e) => setP((prev) => ({ ...prev, logo_url: e.target.value }))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-black px-4 py-2 text-white"
        >
          {saving ? "Saving…" : "Save Branding"}
        </button>
        {p.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logo_url} alt="Logo preview" className="h-10 rounded-lg" />
        ) : null}
      </div>
    </main>
  );
}
