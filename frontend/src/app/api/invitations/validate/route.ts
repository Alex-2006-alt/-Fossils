import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/invitations/validate?token=xxx — Validate an invitation token (public).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { family: { select: { name: true } } },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid invitation link" },
      { status: 404 }
    );
  }

  if (invitation.usedAt) {
    return NextResponse.json(
      { error: "This invitation has already been used" },
      { status: 400 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    familyName: invitation.family.name,
    email: invitation.email, // may be null
    role: invitation.role,
  });
}
