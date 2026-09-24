import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/http";
import { HttpError, tokenHash } from "@famvault/runtime/security";
import { rateLimit, clientIp } from "@famvault/runtime/rate-limit";
export async function GET(req: NextRequest) {
  try {
    await rateLimit("invite-check:" + clientIp(req), 30, 60000);
    const token = new URL(req.url).searchParams.get("token");
    if (!token || token.length > 200)
      throw new HttpError(400, "Invalid invitation");
    const row = await prisma.invitation.findUnique({
      where: { token: tokenHash(token) },
      include: { family: { select: { name: true } } },
    });
    if (!row || row.usedAt || row.expiresAt <= new Date())
      throw new HttpError(400, "Invitation is invalid or expired");
    return NextResponse.json(
      { familyName: row.family.name, role: row.role },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
