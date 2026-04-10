import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aiSummarize(payload: { notes: string; jeSnapshot?: any; mode: string }) {
  const { data, error } = await supabase.functions.invoke("ai-summarize", {
    body: payload,
  });

  if (error) throw new Error(error.message || "AI summarize failed");
  if (!data?.ok) throw new Error(data?.error || "AI summarize failed");

  return data.summary as string;
}

export async function aiCaption(payload: { fileName?: string; context?: string }) {
  const { data, error } = await supabase.functions.invoke("ai-caption", {
    body: payload,
  });

  if (error) throw new Error(error.message || "AI caption failed");
  if (!data?.ok) throw new Error(data?.error || "AI caption failed");

  return data.caption as string;
}

export async function aiCodes(payload: { notes: string; jurisdiction?: string }) {
  const { data, error } = await supabase.functions.invoke("ai-codes", {
    body: payload,
  });

  if (error) throw new Error(error.message || "AI codes failed");
  if (!data?.ok) throw new Error(data?.error || "AI codes failed");

  return data.items as Array<{ ref: string; note: string }>;
}
