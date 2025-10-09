/**
 * File Naming Strategies
 */

import { FileNamer } from "../core/contracts";
import {
  generateRandomFileName,
  generateUUID,
  sanitizeFileName,
} from "../core/utils";

/**
 * Random file namer - generates random filenames while preserving extension
 */
export class RandomFileNamer implements FileNamer {
  generate(originalName: string): string {
    return generateRandomFileName(originalName);
  }
}

/**
 * Original file namer - keeps original filename (sanitized)
 */
export class OriginalFileNamer implements FileNamer {
  generate(originalName: string): string {
    return sanitizeFileName(originalName);
  }
}

/**
 * UUID file namer - generates UUID-based filenames
 */
export class UUIDFileNamer implements FileNamer {
  generate(originalName: string): string {
    const ext = originalName.substring(originalName.lastIndexOf("."));
    return `${generateUUID()}${ext}`;
  }
}

/**
 * Factory to create file namers
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
