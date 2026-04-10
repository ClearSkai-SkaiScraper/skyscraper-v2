import { z } from "zod";

export const TemplateSchema = z.object({
  coverTitle: z.string().default("Report"),
  coverSubtitle: z.string().default("Generated Preview"),
  bodyHtml: z.string().default("<p>Template body</p>"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderTemplateHtml(templateJson: unknown, sampleData: Record<string, any>) {
  const t = TemplateSchema.parse(templateJson);

  // extremely simple merge example — replace with your real merge engine
  const mergedBody = t.bodyHtml.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (_, path) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = path.split(".").reduce((acc: any, k: string) => acc?.[k], sampleData);
    return value == null ? "" : String(value);
  });

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 0; }
        .page { width: 8.5in; min-height: 11in; padding: 0.8in; box-sizing: border-box; }
        .cover { display:flex; flex-direction:column; justify-content:center; align-items:center; height: 11in; }
        .title { font-size: 44px; font-weight: 800; letter-spacing: 0.5px; }
        .subtitle { font-size: 16px; margin-top: 10px; opacity: 0.8; }
        .brand { margin-top: 24px; font-size: 12px; opacity: 0.75; }
        hr { margin: 30px 0; opacity: 0.25; }
      </style>
    </head>
    <body>
      <section class="page cover">
        <div class="title">${escapeHtml(t.coverTitle)}</div>
        <div class="subtitle">${escapeHtml(t.coverSubtitle)}</div>
        <div class="brand">Preview generated automatically</div>
      </section>

      <section class="page">
        <hr/>
        ${mergedBody}
      </section>
    </body>
  </html>`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
