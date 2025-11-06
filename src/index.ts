/**
 * Media Drive v2 - Main Entry Point
 *
 * This is the main entry point for the @uniflapp/node-media-library package.
 * It exports all public APIs including factory functions, services, contracts, and utilities.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createMediaLibrary } from "@uniflapp/node-media-library";
 *
 * const mediaLibrary = createMediaLibrary({
 *   config: {
 *     disk: "local",
 *     disks: {
 *       local: {
 *         driver: "local",
 *         root: "./storage",
 *         public_base_url: "http://localhost:3000/storage"
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * ## Main Exports
 *
 * - **Factory Functions**: `createMediaLibrary()`, `createEnhancedMediaLibrary()`
 * - **Core Services**: `MediaLibrary`, `EnhancedMediaLibrary`
 * - **Contracts**: Storage drivers, conversion processors, queue drivers, etc.
 * - **Storage Drivers**: Local, S3, BunnyCDN implementations
 * - **HTTP Adapters**: Express middleware and routers
 * - **Validation**: File validation utilities
 * - **Types**: TypeScript type definitions
 *
 * @packageDocumentation
 */

// ==================== Core Exports ====================
/**
 * Core module exports:
 * - Contracts (interfaces for pluggable components)
 * - Errors (custom error classes)
 * - Logger (logging facade)
 * - Utils (utility functions)
 */
export * from "./core";

/**
 * Configuration module exports:
 * - Schema definitions and validation
 * - Configuration loader
 * - defineConfig helper
 */
export * from "./config";

/**
 * Registry module exports:
 * - Dependency injection container
 * - Registry tokens
 */
export * from "./registry";

// ==================== Storage Drivers ====================
/**
 * Storage drivers module exports:
 * - LocalStorageDriver
 * - S3StorageDriver
 * - BunnyCDNStorageDriver
 * - createStorageDriver factory
 */
export * from "./storage";

// ==================== Conversions ====================
/**
 * Conversions module exports:
 * - SharpProcessor (image processing)
 * - Format helpers (MIME type detection, etc.)
 */
export * from "./conversions";

// ==================== Queue Drivers ====================
/**
 * Queue drivers module exports:
 * - BullMQDriver (Redis-based queue)
 * - InMemoryQueueDriver (in-memory queue)
 */
export * from "./queue";

// ==================== Strategies ====================
/**
 * Strategies module exports:
 * - File naming strategies (random, original, UUID)
 * - Path generation strategies (default, simple, date-based, flat)
 */
export * from "./strategies";

// ==================== Media Library ====================
/**
 * Media library module exports:
 * - MediaLibrary (main service class)
 * - FileService, UrlService (internal services)
 * - File type detection utilities
 */
export * from "./media";

/**
 * Factory module exports:
 * - createMediaLibrary() factory function
 * - createEnhancedMediaLibrary() factory function
 * - Factory option interfaces
 */
export * from "./factory";

// ==================== HTTP Adapters ====================
/**
 * HTTP adapters module exports:
 * - ApiRouter (RESTful API routes)
 * - MultipartMiddleware (file upload handling)
 */
export * from "./http";

// ==================== Enhanced Features ====================
/**
 * Validation module exports:
 * - FileValidator (comprehensive file validation)
 * - Validation configuration interfaces
 */
export * from "./validation";

// ==================== Migration Utilities ====================
/**
 * Migration utilities module exports:
 * - Database migration helpers
 */
export * from "./migration";

// ==================== Shared Types ====================
/**
 * Shared types module exports:
 * - MediaRecord interface
 * - AttachFileOptions, AttachFromUrlOptions
 * - MediaLibraryService interface
 * - Storage configuration types
 */
export * from "./types";

// ==================== Re-export for Convenience ====================
/**
 * Convenience re-exports of commonly used factory functions and classes.
 * These are the primary entry points for most users.
 */
export {
  createMediaLibrary,
  createEnhancedMediaLibrary,
  CreateMediaLibraryOptions,
  CreateEnhancedMediaLibraryOptions,
} from "./factory";
export { MediaLibrary } from "./media/media-library";
export { EnhancedMediaLibrary } from "./media/enhanced-media-library";
export { defineConfig } from "./config/schema";

// ==================== Backward Compatibility ====================

/**
 * Initialize media library (deprecated).
 *
 * This function is deprecated and maintained only for backward compatibility.
 * It does not actually initialize anything and only logs a deprecation warning.
 *
 * @deprecated Use `createMediaLibrary()` instead. This function will be removed in a future version.
 * @param _config - Configuration object (ignored, kept for API compatibility).
 *
 * @example
 * ```typescript
 * // ❌ Deprecated - Don't use this
 * initMediaLibrary(config);
 *
 * // ✅ Use this instead
 * const mediaLibrary = createMediaLibrary({ config });
 * ```
 */
export function initMediaLibrary(_config: unknown): void {
  console.warn(
    "[DEPRECATION WARNING] initMediaLibrary() is deprecated. Use createMediaLibrary() instead."
  );
  // For backward compatibility, we'll store config globally
  // but recommend migration to the new factory pattern
}
