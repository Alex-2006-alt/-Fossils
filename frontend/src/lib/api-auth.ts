import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./db";
import { Role, hasRole } from "@/types";

// ════════════════════════════════════════════════════════════
// FamVault — API Auth & Authorization Middleware
// ════════════════════════════════════════════════════════════

export interface AuthContext {
  userId: string;
  userName: string;
  email: string;
  role: Role;
  familyId: string;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with authentication and family-boundary enforcement.
 *
 * @param handler - The handler function that receives the authenticated context
 * @param options.minRole - Minimum role required (default: VIEWER)
 *
 * Usage:
 * ```ts
 * export const GET = withFamilyAuth(async (req, ctx) => {
 *   // ctx.userId, ctx.familyId, ctx.role are guaranteed
 *   const photos = await prisma.media.findMany({
 *     where: { uploader: { familyId: ctx.familyId } }
 *   });
 *   return NextResponse.json(photos);
 * });
 * ```
 */
export function withFamilyAuth(
  handler: AuthenticatedHandler,
  options?: { minRole?: Role }
) {
  const minRole = options?.minRole ?? "VIEWER";

  return async (req: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    try {
      // 1. Check session
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // 2. Load user with family
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          familyId: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // 3. Check role
      const userRole = user.role as Role;
      if (!hasRole(userRole, minRole)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      // 4. Build auth context
      const ctx: AuthContext = {
        userId: user.id,
        userName: user.name,
        email: user.email,
        role: userRole,
        familyId: user.familyId,
      };

      // 5. Resolve route params if present
      const params = routeContext?.params ? await routeContext.params : undefined;

      return handler(req, ctx, params);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to extract client IP from request headers.
 */
export function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
