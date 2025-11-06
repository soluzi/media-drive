/**
 * Conversion Helpers
 *
 * Utility functions for image format detection and conversion.
 */

/**
 * Determine if a MIME type represents an image.
 *
 * @param mimeType - MIME type string to check (e.g., "image/jpeg").
 * @returns True if the MIME type starts with "image/", false otherwise.
 *
 * @example
 * isImageMimeType("image/jpeg") // true
 * isImageMimeType("application/pdf") // false
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Get file extension for an image format.
 * Maps format names to their standard file extensions.
 *
 * @param format - Image format name (e.g., "jpeg", "png", "webp").
 * @returns File extension with leading dot (e.g., ".jpg").
 * @default Returns ".jpg" if format is unknown.
 *
 * @example
 * getExtensionForFormat("jpeg") // ".jpg"
 * getExtensionForFormat("webp") // ".webp"
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
 * Get MIME type for an image format.
 * Maps format names to their standard MIME types.
 *
 * @param format - Image format name (e.g., "jpeg", "png", "webp").
 * @returns MIME type string (e.g., "image/jpeg").
 * @default Returns "image/jpeg" if format is unknown.
 *
 * @example
 * getMimeTypeForFormat("jpeg") // "image/jpeg"
 * getMimeTypeForFormat("webp") // "image/webp"
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
