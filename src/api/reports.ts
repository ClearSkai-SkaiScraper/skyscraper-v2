import { supabase } from "@/integrations/supabase/client";

export type NewReport = {
  title: string;
  mode: "insurance" | "retail" | "inspection";
  address?: string;
  summary_md?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
};

export async function createReport(payload: NewReport) {
  // Get org_id and create dummy lead
  const { data: orgRow, error: orgErr } = await supabase.rpc("current_org_id");
  if (orgErr || !orgRow) throw orgErr || new Error("No org");

  const orgId = orgRow as string;

  // Get or create a default template
  const { data: template } = await supabase
    .from("report_templates")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();

  if (!template) throw new Error("No default template found");

  // Create a lead for this report
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .insert({
      org_id: orgId,
      userId: user.id,
      property_address: payload.address || "Quick Report",
      status: "new",
    })
    .select("id")
    .single();

  if (leadErr) throw leadErr;

  // Create report with proper schema
  const { data, error } = await supabase
    .from("reports")
    .insert({
      org_id: orgId,
      lead_id: lead.id,
      template_id: template.id,
      created_by: user.id,
      report_name: payload.title,
      report_data: {
        mode: payload.mode,
        address: payload.address,
        summary_md: payload.summary_md,
        ...payload.data,
      },
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data!.id as string;
}

export type PhotoAnnot = {
  file: File;
  caption?: string;
  ai_labels?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ai_boxes?: any[];
  sort_order?: number;
};

export async function uploadReportPhotos(reportId: string, photos: PhotoAnnot[]) {
  // Use org id in path for neat storage
  const { data: orgRow } = await supabase.rpc("current_org_id");
  const orgId = orgRow as string;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const filename = `${crypto.randomUUID()}_${p.file.name}`;
    const storagePath = `reports/${orgId}/${reportId}/${filename}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(storagePath, p.file, { upsert: false });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase.from("report_photos").insert({
      report_id: reportId,
      storage_path: storagePath,
      caption: p.caption ?? null,
      ai_labels: p.ai_labels ?? null,
      ai_boxes: p.ai_boxes ?? null,
      sort_order: p.sort_order ?? i,
    });
    if (insErr) throw insErr;
  }
}

export function publicUrl(path: string) {
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}

export async function fetchEmptySafeMetrics() {
  const { count: totalReports } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true });

  const { count: totalPhotos } = await supabase
    .from("report_photos")
    .select("*", { count: "exact", head: true });

  // Count insurance reports by checking report_data jsonb field
  const { data: insuranceReports } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("report_data->>mode", "insurance");

  return {
    totalReports: totalReports ?? 0,
    totalPhotos: totalPhotos ?? 0,
    claimsFiled: insuranceReports?.length ?? 0,
  };
}
