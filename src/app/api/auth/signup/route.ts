import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/auth/signup — Register a new user with an invite code.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, inviteCode } = await req.json();

    // Validate inputs
    if (!name || !email || !password || !inviteCode) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Try invite token first, then fall back to family invite code
    const invitation = await prisma.invitation.findUnique({
      where: { token: inviteCode },
    });

    let familyId: string;
    let role = "MEMBER";

    if (invitation) {
      // Validate invitation
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
      if (invitation.email && invitation.email !== email) {
        return NextResponse.json(
          { error: "This invitation was sent to a different email" },
          { status: 400 }
        );
      }
      familyId = invitation.familyId;
      role = invitation.role;
    } else {
      // Fall back to family invite code
      const family = await prisma.family.findUnique({
        where: { inviteCode },
      });

      if (!family) {
        return NextResponse.json(
          { error: "Invalid invite code" },
          { status: 400 }
        );
      }
      familyId = family.id;
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        familyId,
        role,
      },
      include: { family: true },
    });

    // Mark invitation as used
    if (invitation) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), usedById: user.id },
      });
    }

    // Audit log
    await logAudit({
      familyId,
      userId: user.id,
      action: "SIGNUP",
      resourceType: "MEMBER",
      details: { method: invitation ? "invitation" : "invite_code" },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        familyName: user.family.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/signup — Create a new family (bootstrap, first user becomes OWNER).
 */
export async function PUT(req: NextRequest) {
  try {
    const { name, email, password, familyName } = await req.json();

    if (!name || !email || !password || !familyName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Generate invite code
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create family and OWNER user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: familyName,
          inviteCode,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          familyId: family.id,
          role: "OWNER", // First user is OWNER, not just ADMIN
        },
      });

      return { user, family };
    });

    // Audit log
    await logAudit({
      familyId: result.family.id,
      userId: result.user.id,
      action: "SIGNUP",
      resourceType: "FAMILY",
      details: { familyName: result.family.name, role: "OWNER" },
    });

    return NextResponse.json(
      {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        familyName: result.family.name,
        inviteCode: result.family.inviteCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Family creation error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
