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
  const image = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate(); // Auto-rotate from EXIF

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
        const decimal = (value: unknown) =>
          Array.isArray(value)
            ? Number(value[0]) + Number(value[1]) / 60 + Number(value[2]) / 3600
            : Number(value);
        latitude =
          decimal(parsed.GPSInfo.GPSLatitude) *
          (parsed.GPSInfo.GPSLatitudeRef === "S" ? -1 : 1);
        longitude =
          decimal(parsed.GPSInfo.GPSLongitude) *
          (parsed.GPSInfo.GPSLongitudeRef === "W" ? -1 : 1);
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

  if (takenAt && !Number.isFinite(takenAt.getTime())) takenAt = null;
  if (
    latitude !== null &&
    (!Number.isFinite(latitude) || Math.abs(latitude) > 90)
  )
    latitude = null;
  if (
    longitude !== null &&
    (!Number.isFinite(longitude) || Math.abs(longitude) > 180)
  )
    longitude = null;
  const rotated = [5, 6, 7, 8].includes(rawMetadata.orientation || 1);
  const width = (rotated ? rawMetadata.height : rawMetadata.width) || 0;
  const height = (rotated ? rawMetadata.width : rawMetadata.height) || 0;

  // Generate rotated original (in case of EXIF rotation)
  const original = buffer;

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
