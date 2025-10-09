/**
 * URL Signer Contract
 *
 * Defines the interface for signing URLs (optional override)
 */

export interface UrlSigner {
  /**
   * Sign a URL with expiration
   *
   * @param url - Base URL to sign
   * @param expiresInSec - Expiration time in seconds
   * @returns Signed URL
   */
  sign(url: string, expiresInSec?: number | undefined): Promise<string>;
}
