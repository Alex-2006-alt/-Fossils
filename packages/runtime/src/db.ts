import { PrismaClient } from "../generated/index.js";
import { validateConfig } from "./config";
validateConfig();
const globalDb = globalThis as unknown as { famvaultDb?: PrismaClient };
export const prisma = globalDb.famvaultDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.famvaultDb = prisma;
export type { Prisma } from "../generated/index.js";
