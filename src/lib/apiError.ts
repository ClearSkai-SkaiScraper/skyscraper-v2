import { NextResponse } from "next/server";

interface ErrorPayload {
  error: string;
  code: string;
  message: string;
  details?: any;
  traceId?: string;
}

export function apiError(status: number, code: string, message: string, details?: any) {
  const payload: ErrorPayload = {
    error: message,
    code,
    message,
    details,
    traceId: process.env.VERCEL_REQUEST_ID || undefined,
  };
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiOk(data: any, init?: { status?: number }) {
  return NextResponse.json({ ok: true, ...data }, { status: init?.status || 200 });
}

export async function safeHandler<T>(handler: () => Promise<T>, map?: (data: T) => any) {
  try {
    const data = await handler();
    return apiOk(map ? map(data) : data);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", error.errors);
    }
    // Never leak internal error messages to the client
    return apiError(500, "INTERNAL_ERROR", "Internal server error");
  }
}

export function requireValue<T>(value: T | undefined | null, code: string, message: string) {
  if (value === undefined || value === null) {
    throw new Error(`${code}:${message}`);
  }
  return value as T;
}
