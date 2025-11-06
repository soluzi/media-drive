/**
 * File Type Detection
 *
 * Provides utilities for detecting file types and MIME types from buffers.
 * Uses the file-type library for accurate MIME type detection.
 */

import { fileTypeFromBuffer } from "file-type";

/**
 * Detect MIME type from file buffer.
 * Uses magic number detection for accurate type identification.
 *
 * @param buffer - File buffer to analyze.
 * @returns Promise resolving to detected MIME type, or "application/octet-stream" if unknown.
 *
 * @example
 * const mimeType = await detectMimeType(buffer);
 * // Returns: "image/jpeg", "image/png", etc.
 */
export async function detectMimeType(buffer: Buffer): Promise<string> {
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime || "application/octet-stream";
}

/**
 * Check if MIME type represents an image.
 *
 * @param mimeType - MIME type string to check.
 * @returns True if MIME type starts with "image/", false otherwise.
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Check if MIME type represents a video.
 *
 * @param mimeType - MIME type string to check.
 * @returns True if MIME type starts with "video/", false otherwise.
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

/**
 * Check if MIME type represents an audio file.
 *
 * @param mimeType - MIME type string to check.
 * @returns True if MIME type starts with "audio/", false otherwise.
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}
