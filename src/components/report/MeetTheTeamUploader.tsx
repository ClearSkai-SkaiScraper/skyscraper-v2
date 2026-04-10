"use client";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function MeetTheTeamUploader({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value?: { photoUrl?: string; displayName?: string; role?: string }[];
  onChange?: (v: any[]) => void;
}) {
  const [items, setItems] = useState((value || []).slice(0, 3));

  async function upload(index: number, f?: File | null) {
    if (!f) return;
    try {
      // Upload via server-side API for reliable storage with service role key
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();
      const next = items.slice();
      next[index] = { ...(next[index] || {}), photoUrl: url };
      setItems(next);
      onChange?.(next);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    }
  }

  function updateField(i: number, k: string, v: string) {
    const next = items.slice();
    next[i] = { ...(next[i] || {}), [k]: v };
    setItems(next);
    onChange?.(next);
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-16 w-16 overflow-hidden rounded bg-muted">
            {items[i]?.photoUrl ? (
              <img src={items[i].photoUrl} alt="team" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2">
            <input
              placeholder="Name"
              value={items[i]?.displayName || ""}
              onChange={(e) => updateField(i, "displayName", e.target.value)}
              className="rounded border p-2"
            />
            <input
              placeholder="Role"
              value={items[i]?.role || ""}
              onChange={(e) => updateField(i, "role", e.target.value)}
              className="rounded border p-2"
            />
            <label className="col-span-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => upload(i, e.target.files?.[0] ?? null)}
              />
              <Button size="sm">Upload Photo</Button>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
