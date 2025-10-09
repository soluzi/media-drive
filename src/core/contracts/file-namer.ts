/**
 * File Namer Contract
 *
 * Defines the interface for file naming strategies
 */

export interface FileNamer {
  /**
   * Generate a filename from the original name
   *
   * @param originalName - Original uploaded filename
   * @returns New filename (may preserve extension)
   */
  generate(originalName: string): string;
}
