/**
 * Path Generator Contract
 *
 * Defines the interface for generating file storage paths
 */

export interface PathContext {
  modelType: string;
  modelId: string;
  collection: string;
  originalName: string;
  fileName: string;
}

export interface PathResult {
  /**
   * Full path including directory and filename
   */
  path: string;

  /**
   * Directory path only
   */
  directory: string;

  /**
   * Filename only
   */
  fileName: string;

  /**
   * Generated mediaId (for simple path strategy)
   */
  mediaId?: string;
}

export interface PathGenerator {
  /**
   * Generate a storage path for a file
   */
  generate(ctx: PathContext): PathResult;

  /**
   * Generate a conversion path
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult;
}
