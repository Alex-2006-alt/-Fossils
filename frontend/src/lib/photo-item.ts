import { getPublicUrl } from "./storage";
import type { PhotoItem, ProcessingStatus } from "@/types";
interface MediaView {
  id: string;
  filename: string;
  thumbKey: string;
  mediumKey: string | null;
  originalKey: string;
  width: number;
  height: number;
  takenAt: Date | null;
  uploadedAt: Date;
  placeName: string | null;
  processingStatus: string;
  uploader: { name: string };
  favorites: unknown[];
  exifData?: string | null;
}
export function toPhotoItem(photo: MediaView): PhotoItem {
  let exifData: PhotoItem["exifData"] = null;
  try {
    exifData = photo.exifData ? JSON.parse(photo.exifData) : null;
  } catch {}
  return {
    id: photo.id,
    filename: photo.filename,
    thumbUrl: getPublicUrl(photo.thumbKey),
    mediumUrl: getPublicUrl(photo.mediumKey || photo.originalKey),
    originalUrl: getPublicUrl(photo.originalKey),
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt?.toISOString() || null,
    uploadedAt: photo.uploadedAt.toISOString(),
    placeName: photo.placeName,
    isFavorite: photo.favorites.length > 0,
    uploaderName: photo.uploader.name,
    processingStatus: photo.processingStatus as ProcessingStatus,
    exifData,
  };
}
