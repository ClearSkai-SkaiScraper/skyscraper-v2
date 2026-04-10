import { getOpenAI } from "@/lib/ai/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aiDraftReply(claimData: any) {
  const client = getOpenAI();
  const prompt = `You are a claims coordinator. Draft a short, friendly update for the homeowner based on this claim JSON:\n${JSON.stringify(claimData, null, 2)}`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content?.trim() || "Update pending.";
}
