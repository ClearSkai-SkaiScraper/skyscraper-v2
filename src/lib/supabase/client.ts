import { logger } from "@/lib/logger";

/**
 * Supabase client stub
 * Supabase has been replaced by Prisma. This module exists for backward compatibility.
 */

export function createClient() {
  logger.warn("[supabase/client] Supabase is deprecated. Use Prisma instead.");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (..._args: any[]) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: (..._a: any[]) => Promise.resolve({ data: [], error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insert: (..._a: any[]) => Promise.resolve({ data: null, error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: (..._a: any[]) => Promise.resolve({ data: null, error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: (..._a: any[]) => Promise.resolve({ data: null, error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eq: (..._a: any[]) => Promise.resolve({ data: [], error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      order: (..._a: any[]) => Promise.resolve({ data: [], error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (..._a: any[]) => ({ subscribe: (..._b: any[]) => ({}) }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: (..._args: any[]) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (..._a: any[]) => ({ subscribe: (..._b: any[]) => ({}) }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeChannel: (..._args: any[]) => {},
  };
}
