/**
 * File Validation
 */

import { ValidationError } from "../core/errors";
import { MediaConfig } from "../config/schema";

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): void {
  if (size > maxSize) {
    throw new ValidationError(
      `File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
    );
  }
}

/**
 * Validate MIME type against allowed/forbidden lists
 */
export function validateMimeType(mimeType: string, config: MediaConfig): void {
  const { forbiddenMime, allowedMime } = config.security;

  // Check forbidden MIME types first
  if (forbiddenMime.length > 0 && forbiddenMime.includes(mimeType)) {
    throw new ValidationError(
      `File type '${mimeType}' is not allowed (forbidden)`
    );
  }

  // Check allowed MIME types (if list is not empty)
  if (allowedMime.length > 0 && !allowedMime.includes(mimeType)) {
    throw new ValidationError(
      `File type '${mimeType}' is not allowed. Allowed types: ${allowedMime.join(
        ", "
      )}`
    );
  }
}
