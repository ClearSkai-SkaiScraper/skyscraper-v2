import { pgPool as _pgPool } from "@/lib/db/index";
import _prisma from "@/lib/prisma";

export const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: async (text: string, params?: any[]) => {
    return _pgPool.query(text, params);
  },
};

// Re-export Prisma client - ONLY through default import to avoid split instances
export const prisma = _prisma;
export default _prisma;

// Re-export everything from db/index.ts for convenience
export {
  closePool,
  cq,
  cqOne,
  pgPool,
  pool,
  q,
  qExec,
  qOne,
  qScalar,
  type Row,
  withTx,
} from "@/lib/db/index";

// Type exports
export type { Pool } from "pg";
