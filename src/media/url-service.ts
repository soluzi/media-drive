/**
 * URL Service
 *
 * Handles URL generation and signing
 */

import { StorageDriver } from "../core/contracts";
import { MediaConfig } from "../config/schema";

export class UrlService {
  constructor(private config: MediaConfig, private storage: StorageDriver) {}

  /**
   * Resolve URL for a file
   */
  async resolveUrl(path: string, signed: boolean = false): Promise<string> {
    let url: string;

    if (signed || this.config.urls.signedDefault) {
      url = await this.storage.temporaryUrl(
        path,
        this.config.urls.temporaryUrlExpiry
      );
    } else {
      url = this.storage.url(path);
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
