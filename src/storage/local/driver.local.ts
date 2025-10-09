/**
 * Local Storage Driver
 *
 * Implements file storage on the local filesystem
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { StorageDriver, PutOptions, StoredObject } from "../../core/contracts";
import { StorageError } from "../../core/errors";
import { LocalDisk } from "../../config/schema";

export class LocalStorageDriver implements StorageDriver {
  private root: string;
  private publicBaseUrl: string;

  constructor(config: LocalDisk) {
    this.root = config.root;
    this.publicBaseUrl = config.public_base_url;
  }

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

  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.root, path);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  url(path: string): string {
    // Normalize path separators for URLs
    const normalizedPath = path.replace(/\\/g, "/");
    return `${this.publicBaseUrl}/${normalizedPath}`;
  }

  async temporaryUrl(
    path: string,
    _expiresInSec?: number | undefined
  ): Promise<string> {
    // Local storage doesn't support signed URLs natively
    // Return regular URL (could be extended with custom signing logic)
    return this.url(path);
  }
}
