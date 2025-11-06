/**
 * Storage Driver Contract
 *
 * Defines the interface for all storage backends (local, S3, BunnyCDN, etc.)
 * Implementations must provide all methods for complete storage functionality.
 */

/**
 * Options for storing files.
 */
export interface PutOptions {
  /** MIME type/content type of the file (e.g., "image/jpeg"). */
  contentType?: string | undefined;
  /** File visibility: "public" for public access, "private" for restricted. */
  visibility?: "public" | "private" | undefined;
  /** Additional metadata to store with the file. */
  metadata?: Record<string, string> | undefined;
}

/**
 * Result object returned after storing a file.
 */
export interface StoredObject {
  /** Storage path where the file was saved. */
  path: string;
  /** File size in bytes. */
  size: number;
  /** ETag for the stored object (if available). */
  etag?: string | undefined;
  /** Last modification timestamp (if available). */
  lastModified?: Date | undefined;
}

/**
 * Storage driver interface for file storage operations.
 * All storage backends (local filesystem, S3, BunnyCDN, etc.) must implement this interface.
 */
export interface StorageDriver {
  /**
   * Store a file at the given path.
   *
   * @param path - Storage path where the file should be saved.
   * @param contents - File contents as Buffer or string.
   * @param opts - Optional storage options (content type, visibility, metadata).
   * @returns Promise resolving to stored object information.
   * @throws {StorageError} If storage operation fails.
   */
  put(
    path: string,
    contents: Buffer | string,
    opts?: PutOptions | undefined
  ): Promise<StoredObject>;

  /**
   * Retrieve file contents from storage.
   *
   * @param path - Storage path of the file to retrieve.
   * @returns Promise resolving to file contents as Buffer.
   * @throws {StorageError} If file doesn't exist or retrieval fails.
   */
  get(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage.
   *
   * @param path - Storage path of the file to delete.
   * @returns Promise that resolves when deletion is complete.
   * @throws {StorageError} If deletion fails.
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists in storage.
   *
   * @param path - Storage path to check.
   * @returns Promise resolving to true if file exists, false otherwise.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get public URL for a file (if visibility=public).
   * Returns a permanent URL that can be used to access the file.
   *
   * @param path - Storage path of the file.
   * @returns Public URL string.
   */
  url(path: string): string;

  /**
   * Generate a temporary signed URL with expiration.
   * Useful for private files that need time-limited access.
   *
   * @param path - Storage path of the file.
   * @param expiresInSec - Expiration time in seconds (default varies by driver).
   * @returns Promise resolving to signed URL string.
   */
  temporaryUrl(
    path: string,
    expiresInSec?: number | undefined
  ): Promise<string>;
}
