// Shared type definitions for FamVault

export type Role = "ADMIN" | "MEMBER" | "VIEWER";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  familyId: string;
  familyName: string;
}

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
  exifData: {
    camera?: string | null;
    focalLength?: number | null;
    aperture?: number | null;
    iso?: number | null;
    exposureTime?: number | null;
  } | null;
}

export interface TimelineGroup {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "March 15, 2024"
  photos: PhotoItem[];
}

export interface AlbumItem {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  photoCount: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
}
