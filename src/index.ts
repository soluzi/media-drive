/**
 * Media Drive v2
 *
 * Main entry point with factory pattern and backward compatibility
 */

// ==================== Core Exports ====================
export * from "./core";
export * from "./config";
export * from "./registry";

// ==================== Storage Drivers ====================
export * from "./storage";

// ==================== Conversions ====================
export * from "./conversions";

// ==================== Queue Drivers ====================
export * from "./queue";

// ==================== Strategies ====================
export * from "./strategies";

// ==================== Media Library ====================
export * from "./media";
export * from "./factory";

// ==================== HTTP Adapters ====================
export * from "./http";

// ==================== Re-export for Convenience ====================
export { createMediaLibrary } from "./factory";
export { MediaLibrary } from "./media/media-library";
export { defineConfig } from "./config/schema";

// ==================== Backward Compatibility ====================

/**
 * @deprecated Use createMediaLibrary() instead
 */
export function initMediaLibrary(_config: any): void {
  console.warn(
    "[DEPRECATION WARNING] initMediaLibrary() is deprecated. Use createMediaLibrary() instead."
  );
  // For backward compatibility, we'll store config globally
  // but recommend migration to the new factory pattern
}
