export type AIModuleKey = "ai.summary" | "ai.captions" | "ai.codes" | "ai.weather" | "ai.mockup";

export type AIModule = {
  key: AIModuleKey;
  cost: number; // tokens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: (ctx: any) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (ctx: any) => Promise<any>;
};

export const AIEngineRegistry: Record<AIModuleKey, AIModule> = {
  "ai.summary": {
    key: "ai.summary",
    cost: 3,
    trigger: (ctx) => ctx?.reportType === "claims" || ctx?.reportType === "proposal",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async (ctx) => ({ summary: "AI executive summary placeholder." }),
  },
  "ai.captions": {
    key: "ai.captions",
    cost: 1,
    trigger: (ctx) => Array.isArray(ctx?.photos) && ctx.photos.length > 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: async (ctx) => ({ captions: ctx.photos.map((_: any, i: number) => `Caption ${i + 1}`) }),
  },
  "ai.codes": {
    key: "ai.codes",
    cost: 5,
    trigger: (ctx) => ctx?.reportType === "claims",
    run: async () => ({ codes: ["IRC R903.4", "IBC 1507.2"] }),
  },
  "ai.weather": {
    key: "ai.weather",
    cost: 2,
    trigger: (ctx) => Boolean(ctx?.address),
    run: async () => ({ weather: { dol: "2024-07-21", hail: "Severe", wind: "High" } }),
  },
  "ai.mockup": {
    key: "ai.mockup",
    cost: 10,
    trigger: () => false,
    run: async () => ({ mockupUrl: "https://example.com/mock.png" }),
  },
};
