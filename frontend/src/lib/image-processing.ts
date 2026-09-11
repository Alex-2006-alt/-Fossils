import sharp from "sharp";

export interface ImageMetadata {
  width: number;
  height: number;
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  exifData: Record<string, unknown> | null;
}

export interface ProcessedImage {
  original: Buffer;
  thumb: Buffer;
  medium: Buffer;
  metadata: ImageMetadata;
}

/**
 * Process an uploaded image:
 * - Extract EXIF metadata (date taken, GPS coordinates)
 * - Auto-rotate based on EXIF orientation
 * - Generate thumbnail (300px) and medium (1200px) versions
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const image = sharp(buffer).rotate(); // Auto-rotate from EXIF

  const rawMetadata = await image.metadata();

  // Extract EXIF data
  let takenAt: Date | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  let exifData: Record<string, unknown> | null = null;

  if (rawMetadata.exif) {
    try {
      const { default: exifReader } = await import("exif-reader");
      const parsed = exifReader(rawMetadata.exif);

      if (parsed?.Photo?.DateTimeOriginal) {
        const dto = parsed.Photo.DateTimeOriginal;
        takenAt = dto instanceof Date ? dto : new Date(String(dto));
      } else if (parsed?.Image?.DateTime) {
        const dt = parsed.Image.DateTime;
        takenAt = dt instanceof Date ? dt : new Date(String(dt));
      }

      if (parsed?.GPSInfo?.GPSLatitude && parsed?.GPSInfo?.GPSLongitude) {
        latitude = Number(parsed.GPSInfo.GPSLatitude as unknown);
        longitude = Number(parsed.GPSInfo.GPSLongitude as unknown);
      }

      exifData = {
        camera: parsed?.Image?.Make
          ? `${parsed.Image.Make} ${parsed.Image.Model || ""}`
          : null,
        focalLength: parsed?.Photo?.FocalLength ?? null,
        aperture: parsed?.Photo?.FNumber ?? null,
        iso: parsed?.Photo?.ISOSpeedRatings ?? null,
        exposureTime: parsed?.Photo?.ExposureTime ?? null,
      };
    } catch {
      // EXIF parsing failed — that's fine, continue without it
    }
  }

  const width = rawMetadata.width || 0;
  const height = rawMetadata.height || 0;

  // Generate rotated original (in case of EXIF rotation)
  const original = await image.jpeg({ quality: 90 }).toBuffer();

  // Generate thumbnail (300px wide, maintaining aspect ratio)
  const thumb = await sharp(buffer)
    .rotate()
    .resize(300, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Generate medium (1200px wide)
  const medium = await sharp(buffer)
    .rotate()
    .resize(1200, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    original,
    thumb,
    medium,
    metadata: {
      width,
      height,
      takenAt,
      latitude,
      longitude,
      exifData,
    },
  };
}
