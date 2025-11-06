/**
 * Path Generator Contract
 *
 * Defines the interface for generating file storage paths.
 * Implementations can create simple UUID-based paths, model-based paths, etc.
 */

/**
 * Context information for path generation.
 */
export interface PathContext {
  /** Model type (e.g., "User", "Post"). */
  modelType: string;
  /** Model instance ID. */
  modelId: string;
  /** Collection name. */
  collection: string;
  /** Original uploaded filename. */
  originalName: string;
  /** Generated filename (after naming strategy). */
  fileName: string;
}

/**
 * Result of path generation operation.
 */
export interface PathResult {
  /**
   * Full storage path including directory and filename.
   * Example: "User/123/photo.jpg" or "8e197ba4-25db-4234-8ec9-4013a521679f/photo.jpg"
   */
  path: string;

  /**
   * Directory path only (without filename).
   * Example: "User/123" or "8e197ba4-25db-4234-8ec9-4013a521679f"
   */
  directory: string;

  /**
   * Filename only (without directory).
   * Example: "photo.jpg"
   */
  fileName: string;

  /**
   * Generated mediaId (for simple path strategy).
   * Only present when using UUID-based path generation.
   */
  mediaId?: string;
}

/**
 * Path generator interface for creating storage paths.
 * Implementations determine how files are organized in storage.
 */
export interface PathGenerator {
  /**
   * Generate a storage path for a file.
   * Creates the full path structure based on model, collection, and filename.
   *
   * @param ctx - Path context with model and file information.
   * @returns Path result with full path, directory, and filename.
   */
  generate(ctx: PathContext): PathResult;

  /**
   * Generate a conversion path for a processed image variant.
   * Typically appends conversion name to the original path.
   *
   * @param ctx - Path context with model and file information.
   * @param conversionName - Name of the conversion (e.g., "thumb", "large").
   * @returns Path result for the conversion file.
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult;
}
