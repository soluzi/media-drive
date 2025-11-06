/**
 * URL Service
 *
 * Handles URL generation and signing.
 * Provides unified URL resolution with support for prefixes, versioning, and signed URLs.
 */

import { StorageDriver } from "../core/contracts";
import { MediaConfig } from "../config/schema";

/**
 * URL service for generating file URLs.
 * Handles public URLs, signed URLs, prefixes, and versioning.
 */
export class UrlService {
  /**
   * Creates a new UrlService instance.
   *
   * @param config - Media library configuration.
   * @param storage - Storage driver for URL generation.
   */
  constructor(private config: MediaConfig, private storage: StorageDriver) {}

  /**
   * Resolve URL for a file.
   * Applies configuration for signed URLs, prefixes, and versioning.
   *
   * @param path - Storage path of the file.
   * @param signed - Whether to generate a signed/temporary URL (default: false).
   * @param storageDriver - Optional storage driver override (uses default if not provided).
   * @returns Promise resolving to complete file URL.
   */
  async resolveUrl(
    path: string,
    signed: boolean = false,
    storageDriver?: StorageDriver | undefined
  ): Promise<string> {
    // Use provided storage driver or fall back to default
    const driver = storageDriver || this.storage;

    let url: string;

    if (signed || this.config.urls.signedDefault) {
      url = await driver.temporaryUrl(
        path,
        this.config.urls.temporaryUrlExpiry
      );
    } else {
      url = driver.url(path);
    }

    // Add prefix if configured
    if (this.config.urls.prefix) {
      url = `${this.config.urls.prefix}${url}`;
    }

    // Add version parameter if configured
    if (this.config.urls.version) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}v=${Date.now()}`;
    }

    return url;
  }
}
