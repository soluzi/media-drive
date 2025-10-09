/**
 * BunnyCDN Storage Driver
 *
 * Implements file storage on BunnyCDN edge storage
 */

import axios from "axios";
import { StorageDriver, PutOptions, StoredObject } from "../../core/contracts";
import { StorageError } from "../../core/errors";
import { BunnyCDNDisk } from "../../config/schema";

export class BunnyCDNStorageDriver implements StorageDriver {
  private storageZone: string;
  private apiKey: string;
  private pullZone: string;
  private root: string;
  private region: string;

  constructor(config: BunnyCDNDisk) {
    this.storageZone = config.storage_zone;
    this.apiKey = config.api_key;
    this.pullZone = config.pull_zone;
    this.root = config.root || "";
    this.region = config.region || "de";
  }

  private getStorageApiUrl(): string {
    const regionPrefix = this.region === "de" ? "" : `.${this.region}`;
    return `https://storage${regionPrefix}.bunnycdn.com/${this.storageZone}`;
  }

  private getFullPath(path: string): string {
    if (this.root) {
      return `${this.root}/${path}`;
    }
    return path;
  }

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

  url(path: string): string {
    const fullPath = this.getFullPath(path);
    return `https://${this.pullZone}/${fullPath}`;
  }

  async temporaryUrl(
    path: string,
    _expiresInSec?: number | undefined
  ): Promise<string> {
    // BunnyCDN uses token authentication for secure URLs
    // For now, return regular URL (can be extended with token signing)
    return this.url(path);
  }
}
