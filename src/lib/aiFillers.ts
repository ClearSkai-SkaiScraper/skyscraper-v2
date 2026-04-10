const getEdgeFunctionUrl = (fnName: string) =>
  // eslint-disable-next-line no-restricted-syntax
  `${((process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace("/rest/v1", "")}/functions/v1/${fnName}`;

export async function fillOverview({ reportId, prompt }: { reportId: string; prompt?: string }) {
  const url = getEdgeFunctionUrl("summarize-report");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, prompt, type: "overview" }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fillCode({ reportId, prompt }: { reportId: string; prompt?: string }) {
  const url = getEdgeFunctionUrl("lookup-codes");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, prompt }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fillTimeline({ reportId, prompt }: { reportId: string; prompt?: string }) {
  const url = getEdgeFunctionUrl("summarize-report");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, prompt, type: "timeline" }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fillPricing({ reportId, prompt }: { reportId: string; prompt?: string }) {
  const url = getEdgeFunctionUrl("summarize-report");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, prompt, type: "pricing-retail" }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
