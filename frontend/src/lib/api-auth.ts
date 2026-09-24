import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./db";
import { type Role, hasRole } from "@/types";
import { checkOrigin, HttpError } from "@famvault/runtime/security";
import { rateLimit, clientIp } from "@famvault/runtime/rate-limit";
import { apiError } from "./http";
export interface AuthContext {
  userId: string;
  userName: string;
  email: string;
  role: Role;
  familyId: string;
}
type Handler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>,
) => Promise<NextResponse | Response>;
export function withFamilyAuth(handler: Handler, options?: { minRole?: Role }) {
  return async (
    req: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      checkOrigin(req);
      const session = await auth();
      if (!session?.user?.id)
        throw new HttpError(401, "Authentication required");
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (!user || user.disabledAt)
        throw new HttpError(401, "Authentication required");
      if (!hasRole(user.role as Role, options?.minRole ?? "VIEWER"))
        throw new HttpError(403, "Insufficient permissions");
      if (!["GET", "HEAD"].includes(req.method))
        await rateLimit("mutation:" + user.id, 120, 60000);
      const response = await handler(
        req,
        {
          userId: user.id,
          userName: user.name,
          email: user.email,
          role: user.role as Role,
          familyId: user.familyId,
        },
        routeContext?.params ? await routeContext.params : undefined,
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      return apiError(error);
    }
  };
}
export const getClientIp = (req: NextRequest) => clientIp(req);
