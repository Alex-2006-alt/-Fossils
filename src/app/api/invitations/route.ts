import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth, getClientIp } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/invitations — List all invitations for the family.
 */
export const GET = withFamilyAuth(
  async (req, ctx) => {
    const invitations = await prisma.invitation.findMany({
      where: { familyId: ctx.familyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      items: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        expiresAt: inv.expiresAt.toISOString(),
        usedAt: inv.usedAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  },
  { minRole: "ADMIN" }
);

/**
 * POST /api/invitations — Create a new invitation link.
 * Requires ADMIN role.
 */
export const POST = withFamilyAuth(
  async (req: NextRequest, ctx) => {
    const { email, role } = await req.json();

    // Validate role — can only assign roles lower than your own
    const assignableRoles = ["MEMBER", "VIEWER"];
    if (ctx.role === "OWNER") assignableRoles.push("ADMIN");
    
    const assignRole = role || "MEMBER";
    if (!assignableRoles.includes(assignRole)) {
      return NextResponse.json(
        { error: `Cannot assign role: ${assignRole}` },
        { status: 400 }
      );
    }

    // Create invitation (valid for 7 days)
    const invitation = await prisma.invitation.create({
      data: {
        familyId: ctx.familyId,
        email: email || null,
        role: assignRole,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: ctx.userId,
      },
    });

    // Build invite URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    // Audit log
    await logAudit({
      familyId: ctx.familyId,
      userId: ctx.userId,
      action: "INVITE_CREATE",
      resourceType: "INVITATION",
      resourceId: invitation.id,
      details: { email, role: assignRole, expiresAt: invitation.expiresAt },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(
      {
        id: invitation.id,
        token: invitation.token,
        inviteUrl,
        expiresAt: invitation.expiresAt.toISOString(),
      },
      { status: 201 }
    );
  },
  { minRole: "ADMIN" }
);

/**
 * DELETE /api/invitations — Revoke an invitation.
 */
export const DELETE = withFamilyAuth(
  async (req: NextRequest, ctx) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID required" },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({ where: { id } });

    if (!invitation || invitation.familyId !== ctx.familyId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    await prisma.invitation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" }
);
