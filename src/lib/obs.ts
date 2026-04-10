/* eslint-disable no-console */
import { randomUUID } from "crypto";

export function withObs(handler: (req: Request, ctx: { reqId: string }) => Promise<Response>) {
  return async (req: Request) => {
    const reqId = randomUUID();
    const t0 = Date.now();
    try {
      const res = await handler(req, { reqId });
      console.log(
        JSON.stringify({
          level: "info",
          msg: "ok",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          route: (req as any).url,
          reqId,
          ms: Date.now() - t0,
          status: res.status,
        })
      );
      return new Response(res.body, {
        status: res.status,
        headers: {
          "x-request-id": reqId,
          ...Object.fromEntries(res.headers.entries()),
        },
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: e?.message || "route error",
          stack: e?.stack,
          reqId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          route: (req as any).url,
          ms: Date.now() - t0,
        })
      );
      return new Response(JSON.stringify({ error: "internal_error", reqId }), {
        status: 500,
        headers: { "x-request-id": reqId },
      });
    }
  };
}
