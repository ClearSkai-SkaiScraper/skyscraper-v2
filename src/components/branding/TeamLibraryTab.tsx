"use client";
import React, { useEffect,useState } from "react";


export default function TeamLibraryTab({ orgId }: { orgId?: string }) {
  const [tiles, setTiles] = useState<any[]>([]);
  useEffect(() => {
    // TODO: Team members functionality requires proper table setup
    // Using mock data for now
    if (orgId) {
      setTiles([
        {
          id: 1,
          display_name: "John Doe",
          role: "Project Manager",
          photo_url: null,
        },
        {
          id: 2,
          display_name: "Jane Smith",
          role: "Inspector",
          photo_url: null,
        },
      ]);
    }
  }, [orgId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function uploadHeadshot(file: File) {
    if (!orgId) return;
    // TODO: Implement team member photo upload when proper schema is available
    alert("Team photo upload not yet implemented - schema needs setup");
    return;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Team Library</h2>
      <div className="mt-4">
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadHeadshot(f);
          }}
        />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4">
        {tiles.slice(0, 12).map((t) => (
          <div key={t.id} className="border p-2">
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.photo_url}
              alt={t.display_name}
              style={{ width: "100%", height: 120, objectFit: "cover" }}
            />
            <div className="mt-2 text-sm">{t.display_name || "Your Photo Here"}</div>
            <div className="text-xs text-muted">{t.role || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
