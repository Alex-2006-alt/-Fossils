// ════════════════════════════════════════════════════════════
// FamVault — Shared Type Definitions
// ════════════════════════════════════════════════════════════

// ── Roles ──
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | "GUEST";

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 5,
  ADMIN: 4,
  MEMBER: 3,
  VIEWER: 2,
  GUEST: 1,
};

/** Check if a role has at least the given minimum permission level */
export function hasRole(userRole: Role, minRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

// ── Processing Status ──
export type ProcessingStatus =
  | "UPLOADED"
  | "VALIDATING"
  | "THUMBNAIL_DONE"
  | "METADATA_DONE"
  | "FACE_DONE"
  | "AI_DONE"
  | "INDEXED"
  | "READY"
  | "FAILED";

// ── Session ──
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  familyId: string;
  familyName: string;
}

// ── Media Items ──
export interface PhotoItem {
  id: string;
  filename: string;
  thumbUrl: string;
  mediumUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
  placeName: string | null;
  isFavorite: boolean;
  uploaderName: string;
  processingStatus: ProcessingStatus;
  exifData: {
    camera?: string | null;
    focalLength?: number | null;
    aperture?: number | null;
    iso?: number | null;
    exposureTime?: number | null;
  } | null;
}

// ── Timeline ──
export interface TimelineGroup {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "March 15, 2024"
  photos: PhotoItem[];
}

// ── Albums ──
export type AlbumType = "MANUAL" | "SMART" | "EVENT" | "AI";

export interface AlbumItem {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  photoCount: number;
  type: AlbumType;
  createdAt: string;
}

// ── People ──
export interface PersonItem {
  id: string;
  name: string | null;
  coverUrl: string | null;
  photoCount: number;
  isHidden: boolean;
}

// ── Memories ──
export interface MemoryItem {
  id: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  story: string | null;
  dateFrom: string;
  dateTo: string;
  locationName: string | null;
  mediaCount: number;
  peopleIds: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isAuto: boolean;
}

// ── Milestones ──
export type MilestoneType =
  | "BIRTHDAY"
  | "WEDDING"
  | "GRADUATION"
  | "BIRTH"
  | "ANNIVERSARY"
  | "TRIP"
  | "NEW_HOME"
  | "OTHER";

export interface MilestoneItem {
  id: string;
  type: MilestoneType;
  title: string;
  date: string;
  personName?: string | null;
  coverUrl?: string | null;
}

// ── Notifications ──
export type NotificationType =
  | "MEMORY"
  | "MILESTONE"
  | "UPLOAD"
  | "CAPSULE"
  | "PEOPLE"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

// ── Feed ──
export type FeedEventType =
  | "UPLOAD"
  | "MEMORY_CREATED"
  | "MILESTONE"
  | "CAPSULE_UNLOCKED"
  | "ALBUM_CREATED";

export interface FeedEventItem {
  id: string;
  type: FeedEventType;
  title: string;
  userName: string;
  mediaPreviewUrls: string[];
  reactions: { emoji: string; count: number }[];
  createdAt: string;
}

// ── Search ──
export interface SearchQuery {
  text: string;
  people?: string[];
  dateRange?: { from: string; to: string };
  location?: string;
  tags?: string[];
}

export interface SearchResult {
  items: PhotoItem[];
  totalCount: number;
  query: SearchQuery;
}
