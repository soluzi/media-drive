/**
 * Conversion Helpers
 */

/**
 * Determine if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Get file extension for a format
 */
export function getExtensionForFormat(format: string): string {
  const map: Record<string, string> = {
    jpeg: ".jpg",
    jpg: ".jpg",
    png: ".png",
    webp: ".webp",
    avif: ".avif",
  };
  return map[format] || ".jpg";
}

/**
 * Get MIME type for a format
 */
export function getMimeTypeForFormat(format: string): string {
  const map: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  return map[format] || "image/jpeg";
}
