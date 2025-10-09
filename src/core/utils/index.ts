/**
 * Core Utilities
 */

import { randomBytes } from "crypto";
import { extname } from "path";

/**
 * Generate a random filename
 */
export function generateRandomFileName(originalName: string): string {
  const ext = extname(originalName);
  const random = randomBytes(16).toString("hex");
  return `${random}${ext}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return randomBytes(16)
    .toString("hex")
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
}

/**
 * Extract file extension
 */
export function getExtension(filename: string): string {
  return extname(filename);
}

/**
 * Get filename without extension
 */
export function getBaseName(filename: string): string {
  const ext = extname(filename);
  return filename.slice(0, -ext.length);
}

/**
 * Sanitize filename - remove special characters
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
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
