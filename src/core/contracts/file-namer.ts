/**
 * File Namer Contract
 *
 * Defines the interface for file naming strategies.
 * Implementations can generate random names, preserve originals, sanitize, etc.
 */

/**
 * File naming strategy interface.
 * Generates filenames for uploaded files based on various strategies.
 */
export interface FileNamer {
  /**
   * Generate a filename from the original name.
   * The implementation may preserve the extension, sanitize, randomize, etc.
   *
   * @param originalName - Original uploaded filename.
   * @returns New filename (extension may be preserved based on strategy).
   *
   * @example
   * // Random strategy: "photo.jpg" -> "a1b2c3d4e5f6.jpg"
   * // Preserve strategy: "photo.jpg" -> "photo.jpg"
   * // Sanitize strategy: "My Photo (2024).jpg" -> "my-photo-2024.jpg"
   */
  generate(originalName: string): string;
}
