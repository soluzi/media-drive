/**
 * File Naming Strategies
 *
 * Provides implementations of file naming strategies.
 * Each strategy determines how uploaded filenames are transformed.
 */

import { FileNamer } from "../core/contracts";
import {
  generateRandomFileName,
  generateUUID,
  sanitizeFileName,
} from "../core/utils";

/**
 * Random file namer strategy.
 * Generates cryptographically secure random filenames while preserving the extension.
 * Example: "photo.jpg" -> "a1b2c3d4e5f6...jpg"
 */
export class RandomFileNamer implements FileNamer {
  /**
   * Generate a random filename preserving the original extension.
   *
   * @param originalName - Original uploaded filename.
   * @returns Random filename with preserved extension.
   */
  generate(originalName: string): string {
    return generateRandomFileName(originalName);
  }
}

/**
 * Original file namer strategy.
 * Keeps the original filename but sanitizes it (removes special characters, normalizes).
 * Example: "My Photo (2024).jpg" -> "my-photo-2024.jpg"
 */
export class OriginalFileNamer implements FileNamer {
  /**
   * Generate a sanitized version of the original filename.
   *
   * @param originalName - Original uploaded filename.
   * @returns Sanitized filename preserving the extension.
   */
  generate(originalName: string): string {
    return sanitizeFileName(originalName);
  }
}

/**
 * UUID file namer strategy.
 * Generates UUID-based filenames while preserving the extension.
 * Example: "photo.jpg" -> "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
 */
export class UUIDFileNamer implements FileNamer {
  /**
   * Generate a UUID-based filename preserving the original extension.
   *
   * @param originalName - Original uploaded filename.
   * @returns UUID filename with preserved extension.
   */
  generate(originalName: string): string {
    const ext = originalName.substring(originalName.lastIndexOf("."));
    return `${generateUUID()}${ext}`;
  }
}

/**
 * Factory function to create file namer instances based on strategy name.
 *
 * @param strategy - Naming strategy: "random", "original", or "uuid".
 * @returns FileNamer instance for the specified strategy.
 * @default Returns RandomFileNamer if strategy is unknown.
 */
export function createFileNamer(
  strategy: "random" | "original" | "uuid"
): FileNamer {
  switch (strategy) {
    case "random":
      return new RandomFileNamer();
    case "original":
      return new OriginalFileNamer();
    case "uuid":
      return new UUIDFileNamer();
    default:
      return new RandomFileNamer();
  }
}
