/**
 * URL Signer Contract
 *
 * Defines the interface for signing URLs (optional override).
 * Implementations can provide custom URL signing logic for temporary access.
 */

/**
 * URL signer interface for creating signed URLs with expiration.
 * Used for generating temporary access URLs for private files.
 */
export interface UrlSigner {
  /**
   * Sign a URL with expiration for temporary access.
   * Adds authentication tokens/parameters to the URL.
   *
   * @param url - Base URL to sign.
   * @param expiresInSec - Expiration time in seconds (default varies by implementation).
   * @returns Promise resolving to signed URL string.
   *
   * @example
   * sign("https://example.com/file.jpg", 3600)
   * // Returns: "https://example.com/file.jpg?signature=abc123&expires=1234567890"
   */
  sign(url: string, expiresInSec?: number | undefined): Promise<string>;
}
