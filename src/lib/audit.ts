import { prisma } from "./db";

// ════════════════════════════════════════════════════════════
// FamVault — Audit Logging
// ════════════════════════════════════════════════════════════

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "SIGNUP"
  | "UPLOAD"
  | "DELETE"
  | "FAVORITE"
  | "UNFAVORITE"
  | "ALBUM_CREATE"
  | "ALBUM_DELETE"
  | "ROLE_CHANGE"
  | "INVITE_CREATE"
  | "INVITE_USE"
  | "MEMBER_REMOVE"
  | "SETTINGS_CHANGE"
  | "GUEST_LINK_CREATE"
  | "GUEST_UPLOAD"
  | "CAPSULE_CREATE"
  | "CAPSULE_UNLOCK"
  | "PERSON_RENAME"
  | "PERSON_MERGE"
  | "MEMORY_CREATE"
  | "EXPORT";

export type AuditResourceType =
  | "MEDIA"
  | "ALBUM"
  | "PERSON"
  | "MEMBER"
  | "FAMILY"
  | "MEMORY"
  | "CAPSULE"
  | "INVITATION"
  | "GUEST_LINK"
  | "SETTINGS";

interface LogAuditParams {
  familyId: string;
  userId?: string;
  action: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an audit event. Fire-and-forget — never block the main request.
 *
 * Usage:
 * ```ts
 * await logAudit({
 *   familyId: ctx.familyId,
 *   userId: ctx.userId,
 *   action: "DELETE",
 *   resourceType: "MEDIA",
 *   resourceId: photoId,
 *   details: { filename: photo.filename },
 * });
 * ```
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        familyId: params.familyId,
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType || null,
        resourceId: params.resourceId || null,
        details: params.details ? (params.details as unknown as import("@prisma/client").Prisma.InputJsonValue) : undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main request
    console.error("Audit log failed:", error);
  }
}
