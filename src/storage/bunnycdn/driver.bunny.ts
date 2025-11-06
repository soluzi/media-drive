/**
 * BunnyCDN Storage Driver
 *
 * Implements file storage on BunnyCDN edge storage.
 * Uses BunnyCDN's REST API for file operations and pull zones for public URLs.
 * Supports multiple regions (de, ny, sg, etc.) for global edge storage.
 */

import axios from "axios";
import { StorageDriver, PutOptions, StoredObject } from "../../core/contracts";
import { StorageError } from "../../core/errors";
import { BunnyCDNDisk } from "../../config/schema";

/**
 * BunnyCDN storage driver implementation.
 * Stores files on BunnyCDN edge storage using their REST API.
 * Files are served via pull zones for fast global CDN delivery.
 */
export class BunnyCDNStorageDriver implements StorageDriver {
  private storageZone: string;
  private apiKey: string;
  private pullZone: string;
  private root: string;
  private region: string;

  /**
   * Creates a new BunnyCDNStorageDriver instance.
   *
   * @param config - BunnyCDN disk configuration with storage zone, API key, pull zone, and optional region.
   */
  constructor(config: BunnyCDNDisk) {
    this.storageZone = config.storage_zone;
    this.apiKey = config.api_key;
    this.pullZone = config.pull_zone;
    this.root = config.root || "";
    this.region = config.region || "de";
  }

  /**
   * Get the storage API URL based on region.
   * German region (de) uses storage.bunnycdn.com, other regions use storage.{region}.bunnycdn.com.
   *
   * @returns Storage API base URL for the configured region.
   */
  private getStorageApiUrl(): string {
    const regionPrefix = this.region === "de" ? "" : `.${this.region}`;
    return `https://storage${regionPrefix}.bunnycdn.com/${this.storageZone}`;
  }

  /**
   * Get full storage path including root prefix.
   *
   * @param path - Relative storage path.
   * @returns Full storage path with root prefix if configured.
   */
  private getFullPath(path: string): string {
    if (this.root) {
      return `${this.root}/${path}`;
    }
    return path;
  }

  /**
   * Store a file on BunnyCDN.
   * Uploads file contents to BunnyCDN storage using their REST API.
   *
   * @param path - Relative storage path where the file should be stored.
   * @param contents - File contents as Buffer or string.
   * @param opts - Optional storage options (content type, visibility, metadata).
   * @returns Promise resolving to stored object information with ETag.
   * @throws {StorageError} If BunnyCDN upload operation fails.
   */
  async put(
    path: string,
    contents: Buffer | string,
    opts?: PutOptions | undefined
  ): Promise<StoredObject> {
    try {
      const fullPath = this.getFullPath(path);
      const buffer =
        typeof contents === "string" ? Buffer.from(contents) : contents;
      const url = `${this.getStorageApiUrl()}/${fullPath}`;

      const response = await axios.put(url, buffer, {
        headers: {
          AccessKey: this.apiKey,
          "Content-Type": opts?.contentType || "application/octet-stream",
        },
      });

      return {
        path,
        size: buffer.length,
        etag: response.headers["etag"],
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
   * Retrieve file contents from BunnyCDN.
   * Downloads the file using BunnyCDN's REST API.
   *
   * @param path - Relative storage path of the file to retrieve.
   * @returns Promise resolving to file contents as Buffer.
   * @throws {StorageError} If file doesn't exist or retrieval fails.
   */
  async get(path: string): Promise<Buffer> {
    try {
      const fullPath = this.getFullPath(path);
      const url = `${this.getStorageApiUrl()}/${fullPath}`;

      const response = await axios.get(url, {
        headers: {
          AccessKey: this.apiKey,
        },
        responseType: "arraybuffer",
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new StorageError(
        `Failed to read file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a file from BunnyCDN.
   * Silently ignores 404 errors (file not found).
   *
   * @param path - Relative storage path of the file to delete.
   * @returns Promise that resolves when deletion is complete.
   * @throws {StorageError} If deletion fails (except for file not found).
   */
  async delete(path: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(path);
      const url = `${this.getStorageApiUrl()}/${fullPath}`;

      await axios.delete(url, {
        headers: {
          AccessKey: this.apiKey,
        },
      });
    } catch (error) {
      // Ignore 404 errors (file not found)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return;
      }
      throw new StorageError(
        `Failed to delete file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if a file exists in BunnyCDN storage.
   * Uses HEAD request to check existence without downloading the file.
   *
   * @param path - Relative storage path to check.
   * @returns Promise resolving to true if file exists, false otherwise.
   */
  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(path);
      const url = `${this.getStorageApiUrl()}/${fullPath}`;

      await axios.head(url, {
        headers: {
          AccessKey: this.apiKey,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for a file via BunnyCDN pull zone.
   * Returns the CDN URL using the configured pull zone for fast global delivery.
   *
   * @param path - Relative storage path of the file.
   * @returns Public CDN URL string.
   */
  url(path: string): string {
    const fullPath = this.getFullPath(path);
    return `https://${this.pullZone}/${fullPath}`;
  }

  /**
   * Generate a temporary signed URL.
   * BunnyCDN supports token authentication for secure URLs, but this is not yet implemented.
   * Currently returns a regular pull zone URL.
   * Can be extended with token signing in the future.
   *
   * @param path - Relative storage path of the file.
   * @param _expiresInSec - Expiration time in seconds (unused, reserved for future token signing).
   * @returns Promise resolving to public URL (not signed, can be extended).
   */
  async temporaryUrl(
    path: string,
    _expiresInSec?: number | undefined
  ): Promise<string> {
    // BunnyCDN uses token authentication for secure URLs
    // For now, return regular URL (can be extended with token signing)
    return this.url(path);
  }
}
