/**
 * Local Storage Driver
 *
 * Implements file storage on the local filesystem.
 * Stores files in a configured root directory and serves them via a public base URL.
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { StorageDriver, PutOptions, StoredObject } from "../../core/contracts";
import { StorageError } from "../../core/errors";
import { LocalDisk } from "../../config/schema";

/**
 * Local filesystem storage driver implementation.
 * Stores files on the local filesystem and generates public URLs.
 */
export class LocalStorageDriver implements StorageDriver {
  private root: string;
  private publicBaseUrl: string;

  /**
   * Creates a new LocalStorageDriver instance.
   *
   * @param config - Local disk configuration with root directory and public base URL.
   */
  constructor(config: LocalDisk) {
    this.root = config.root;
    this.publicBaseUrl = config.public_base_url;
  }

  /**
   * Store a file on the local filesystem.
   * Creates directories as needed and writes the file contents.
   *
   * @param path - Relative path where the file should be stored.
   * @param contents - File contents as Buffer or string.
   * @param _opts - Storage options (currently unused for local storage).
   * @returns Promise resolving to stored object information.
   * @throws {StorageError} If file write operation fails.
   */
  async put(
    path: string,
    contents: Buffer | string,
    _opts?: PutOptions | undefined
  ): Promise<StoredObject> {
    try {
      const fullPath = join(this.root, path);
      const dir = dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      const buffer =
        typeof contents === "string" ? Buffer.from(contents) : contents;
      await fs.writeFile(fullPath, buffer);

      // Get file stats
      const stats = await fs.stat(fullPath);

      return {
        path,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to store file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieve file contents from the local filesystem.
   *
   * @param path - Relative path of the file to retrieve.
   * @returns Promise resolving to file contents as Buffer.
   * @throws {StorageError} If file doesn't exist or read operation fails.
   */
  async get(path: string): Promise<Buffer> {
    try {
      const fullPath = join(this.root, path);
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new StorageError(
        `Failed to read file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a file from the local filesystem.
   * Silently ignores file not found errors.
   *
   * @param path - Relative path of the file to delete.
   * @returns Promise that resolves when deletion is complete.
   * @throws {StorageError} If deletion fails (except for file not found).
   */
  async delete(path: string): Promise<void> {
    try {
      const fullPath = join(this.root, path);
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore file not found errors
      if (
        error instanceof Error &&
        "code" in error &&
        error.code !== "ENOENT"
      ) {
        throw new StorageError(
          `Failed to delete file at ${path}: ${error.message}`
        );
      }
    }
  }

  /**
   * Check if a file exists on the local filesystem.
   *
   * @param path - Relative path to check.
   * @returns Promise resolving to true if file exists, false otherwise.
   */
  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.root, path);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for a file.
   * Combines the public base URL with the file path.
   *
   * @param path - Relative path of the file.
   * @returns Public URL string.
   */
  url(path: string): string {
    // Normalize path separators for URLs
    const normalizedPath = path.replace(/\\/g, "/");
    return `${this.publicBaseUrl}/${normalizedPath}`;
  }

  /**
   * Generate a temporary signed URL.
   * Local storage doesn't support signed URLs natively, so returns a regular URL.
   * Could be extended with custom signing logic if needed.
   *
   * @param path - Relative path of the file.
   * @param _expiresInSec - Expiration time in seconds (unused for local storage).
   * @returns Promise resolving to public URL (not signed).
   */
  async temporaryUrl(
    path: string,
    _expiresInSec?: number | undefined
  ): Promise<string> {
    // Local storage doesn't support signed URLs natively
    // Return regular URL (could be extended with custom signing logic)
    return this.url(path);
  }
}
