/**
 * File Type Detection
 */

import { fileTypeFromBuffer } from "file-type";

/**
 * Detect MIME type from file buffer
 */
export async function detectMimeType(buffer: Buffer): Promise<string> {
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime || "application/octet-stream";
}

/**
 * Check if MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Check if MIME type is a video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

/**
 * Check if MIME type is an audio file
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}
