import { supabase } from "@/integrations/supabase/client";

export type AIBoundingBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
};

export async function annotateImage(
  imageUrl: string
): Promise<{ boxes: AIBoundingBox[]; captions: string[] }> {
  const url = `${
    // eslint-disable-next-line no-restricted-syntax
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_SUPABASE_URL
  }/functions/v1/ai-annotate`;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!res.ok) throw new Error(`annotate failed: ${await res.text()}`);
  return res.json();
}
