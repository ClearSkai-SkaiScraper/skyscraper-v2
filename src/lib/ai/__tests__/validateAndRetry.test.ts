/**
 * TEST — validateAndRetry
 *
 * Validates the AI retry-with-validation utility that:
 *   • Calls an async function and validates the result against a Zod schema
 *   • Retries on validation failure up to N times
 *   • Returns a fallback value when all retries are exhausted
 *   • Handles API errors gracefully
 *   • Invokes onError callback on each failure
 */
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { validateAndRetry } from "../validateAndRetry";

// Mock logger to suppress noise
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("validateAndRetry", () => {
  const testSchema = z.object({
    title: z.string(),
    count: z.number(),
  });

  const fallback = { title: "Fallback", count: 0 };

  it("should return valid content on first try", async () => {
    const call = vi.fn().mockResolvedValueOnce({ title: "Success", count: 42 });

    const result = await validateAndRetry({
      call,
      schema: testSchema,
      fallback,
    });

    expect(result).toEqual({ title: "Success", count: 42 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("should retry on schema validation failure", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ title: "Bad", count: "not a number" }) // fails schema
      .mockResolvedValueOnce({ title: "Fixed", count: 5 }); // passes

    const result = await validateAndRetry({
      call,
      schema: testSchema,
      retries: 2,
      fallback,
    });

    expect(result).toEqual({ title: "Fixed", count: 5 });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("should return fallback after max retries exhausted", async () => {
    const call = vi.fn().mockResolvedValue({ title: 123, count: "bad" }); // always fails schema

    const result = await validateAndRetry({
      call,
      schema: testSchema,
      retries: 2,
      fallback,
    });

    expect(result).toEqual(fallback);
    expect(call).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("should handle API errors gracefully and return fallback", async () => {
    const call = vi.fn().mockRejectedValue(new Error("API Error"));

    const result = await validateAndRetry({
      call,
      schema: testSchema,
      retries: 0, // no retries — fail immediately
      fallback,
    });

    expect(result).toEqual(fallback);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("should call onError callback on each failure", async () => {
    const onError = vi.fn();
    const call = vi.fn().mockResolvedValue({ bad: "data" }); // fails schema every time

    await validateAndRetry({
      call,
      schema: testSchema,
      retries: 1,
      fallback,
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(2); // initial + 1 retry
    expect(onError).toHaveBeenCalledWith(expect.anything(), 0); // attempt 0
    expect(onError).toHaveBeenCalledWith(expect.anything(), 1); // attempt 1
  });
});
