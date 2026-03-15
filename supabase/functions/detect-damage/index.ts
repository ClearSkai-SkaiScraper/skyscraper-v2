/**
 * Detect damage in roofing photos
 * Placeholder: returns mock boxes; swap with vision API or ML model
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
};

const LABEL_MAP: Record<string, string> = {
  hail: "hail_hit",
  hail_hit: "hail_hit",
  missing: "missing_shingle",
  blown: "blown_off_shingle",
  granule: "granule_loss",
  ridge: "ridge_cap_damage",
  flashing: "flashing_damage",
  tile_channel: "tile_channel_mismatch",
  tile_lock: "tile_locking_mismatch",
  // Wind damage labels
  wind: "wind_lifted",
  wind_lifted: "wind_lifted",
  wind_damage: "wind_lifted",
  crease: "wind_creased",
  lifted: "wind_lifted",
  torn: "wind_torn",
  // Wear/age labels
  wear: "wear_damage",
  age: "wear_damage",
  aging: "wear_damage",
  weathering: "wear_damage",
  // General damage labels
  damage: "general_damage",
  crack: "crack_damage",
  broken: "broken_material",
  dent: "metal_dent",
};

function nms(boxes: Box[], iouThreshold = 0.3): Box[] {
  const picked: Box[] = [];
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);

  const iou = (a: Box, b: Box): number => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = a.w * a.h + b.w * b.h - inter;
    return union ? inter / union : 0;
  };

  sorted.forEach((box) => {
    if (!picked.some((p) => iou(p, box) > iouThreshold)) {
      picked.push(box);
    }
  });

  return picked;
}

async function mockDetect(): Promise<Box[]> {
  // Generate varied mock detections for demo - NOT all hail
  const damageTypes = [
    "general_damage",
    "wind_lifted",
    "granule_loss",
    "missing_shingle",
    "crack_damage",
    "wear_damage",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    label: damageTypes[i % damageTypes.length],
    confidence: 0.6 + Math.random() * 0.3,
    x: 40 + i * 25,
    y: 60 + (i % 3) * 40,
    w: 22,
    h: 22,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photo_id, photo_url } = await req.json();
    if (!photo_id && !photo_url) {
      return new Response(JSON.stringify({ error: "photo_id or photo_url required" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("VITE_SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch photo if photo_id provided
    let photoData = photo_url ? { url: photo_url, org_id: null, id: null } : null;

    if (photo_id) {
      const { data, error } = await supabase
        .from("photos")
        .select("id, org_id, file_url")
        .eq("id", photo_id)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Photo not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      photoData = { url: data.file_url, org_id: data.org_id, id: data.id };
    }

    if (!photoData?.url) {
      return new Response(JSON.stringify({ error: "No photo URL available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Replace with actual vision API call
    const rawDetections = await mockDetect();

    // Normalize labels and filter by confidence
    // IMPORTANT: Default to "general_damage" NOT "hail_hit" to avoid over-classification
    const normalized = rawDetections
      .map((d) => ({
        ...d,
        label: LABEL_MAP[d.label] || d.label || "general_damage",
      }))
      .filter((d) => d.confidence >= 0.35);

    // Apply NMS and cap at 300 detections
    const filtered = nms(normalized).slice(0, 300);

    // Persist if we have photo_id and org_id
    if (photo_id && photoData.org_id) {
      const rows = filtered.map((box) => ({
        org_id: photoData.org_id,
        photo_id,
        label: box.label,
        confidence: box.confidence,
        bbox: { x: box.x, y: box.y, w: box.w, h: box.h },
        raw: { detections: rawDetections },
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from("photo_detections").insert(rows);
        if (error) {
          console.error("Failed to save detections:", error);
        }
      }
    }

    return new Response(JSON.stringify({ detections: filtered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in detect-damage:", error);
    return new Response(JSON.stringify({ error: error.message || "Detection failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
