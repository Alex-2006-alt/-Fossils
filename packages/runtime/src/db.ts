import { PrismaClient } from "../generated/index.js";
import { validateConfig } from "./config";
// Skip validation during `next build` page-data collection; only validate at runtime.
if (process.env.NEXT_PHASE !== "phase-production-build") validateConfig();
const globalDb = globalThis as unknown as { famvaultDb?: PrismaClient };
export const prisma = globalDb.famvaultDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.famvaultDb = prisma;
export type { Prisma } from "../generated/index.js";
