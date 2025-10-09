/**
 * Storage Driver Contract
 *
 * Defines the interface for all storage backends (local, S3, BunnyCDN, etc.)
 */

export interface PutOptions {
  contentType?: string | undefined;
  visibility?: "public" | "private" | undefined;
  metadata?: Record<string, string> | undefined;
}

export interface StoredObject {
  path: string;
  size: number;
  etag?: string | undefined;
  lastModified?: Date | undefined;
}

export interface StorageDriver {
  /**
   * Store a file at the given path
   */
  put(
    path: string,
    contents: Buffer | string,
    opts?: PutOptions | undefined
  ): Promise<StoredObject>;

  /**
   * Retrieve file contents from storage
   */
  get(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get public URL for a file (if visibility=public)
   */
  url(path: string): string;

  /**
   * Generate a temporary signed URL
   */
  temporaryUrl(
    path: string,
    expiresInSec?: number | undefined
  ): Promise<string>;
}
