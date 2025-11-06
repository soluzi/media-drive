/**
 * Core Utilities
 *
 * Provides utility functions for file operations, naming, and formatting.
 */

import { randomBytes } from "crypto";
import { extname } from "path";

/**
 * Generate a random filename preserving the original extension.
 * Uses cryptographically secure random bytes for uniqueness.
 *
 * @param originalName - Original filename to extract extension from.
 * @returns Random filename with format: `{32-char-hex}.{ext}`
 *
 * @example
 * generateRandomFileName("photo.jpg") // "a1b2c3d4e5f6...jpg"
 */
export function generateRandomFileName(originalName: string): string {
  const ext = extname(originalName);
  const random = randomBytes(16).toString("hex");
  return `${random}${ext}`;
}

/**
 * Generate a UUID v4-like string using random bytes.
 * Note: This is not a true UUID v4, but provides similar uniqueness.
 *
 * @returns UUID-like string in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
 *
 * @example
 * generateUUID() // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
export function generateUUID(): string {
  return randomBytes(16)
    .toString("hex")
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
}

/**
 * Extract file extension from a filename.
 *
 * @param filename - Filename to extract extension from.
 * @returns File extension including the dot (e.g., ".jpg"), or empty string if no extension.
 *
 * @example
 * getExtension("photo.jpg") // ".jpg"
 * getExtension("document") // ""
 */
export function getExtension(filename: string): string {
  return extname(filename);
}

/**
 * Get filename without its extension.
 *
 * @param filename - Filename to process.
 * @returns Filename without extension.
 *
 * @example
 * getBaseName("photo.jpg") // "photo"
 * getBaseName("document.pdf") // "document"
 */
export function getBaseName(filename: string): string {
  const ext = extname(filename);
  return filename.slice(0, -ext.length);
}

/**
 * Sanitize filename by removing special characters and normalizing.
 * Converts to lowercase, replaces non-alphanumeric chars with hyphens,
 * and removes leading/trailing hyphens.
 *
 * @param filename - Filename to sanitize.
 * @returns Sanitized filename safe for filesystem use.
 *
 * @example
 * sanitizeFileName("My Photo (2024).jpg") // "my-photo-2024.jpg"
 * sanitizeFileName("File---Name.txt") // "file-name.txt"
 */
export function sanitizeFileName(filename: string): string {
  const ext = extname(filename);
  const base = filename.slice(0, -ext.length);
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${sanitized}${ext}`;
}

/**
 * Format bytes to human-readable string.
 * Converts bytes to KB, MB, or GB with 2 decimal places.
 *
 * @param bytes - Number of bytes to format.
 * @returns Human-readable string (e.g., "1.5 MB").
 *
 * @example
 * formatBytes(1024) // "1 KB"
 * formatBytes(1048576) // "1 MB"
 * formatBytes(0) // "0 Bytes"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
