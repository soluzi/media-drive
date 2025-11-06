/**
 * Configuration Schema with Zod
 *
 * Provides runtime validation and type inference for all Media Drive configuration.
 * Uses Zod schemas to validate configuration at runtime and generate TypeScript types.
 *
 * All schemas include sensible defaults and can be overridden via environment variables
 * or user configuration. The main ConfigSchema validates the entire configuration tree.
 *
 * @example
 * ```typescript
 * import { defineConfig, ConfigSchema } from "./config/schema";
 *
 * // Define config with type safety
 * const config = defineConfig({
 *   disk: "s3",
 *   disks: {
 *     s3: {
 *       driver: "s3",
 *       key: process.env.AWS_KEY!,
 *       secret: process.env.AWS_SECRET!,
 *       region: "us-east-1",
 *       bucket: "my-bucket"
 *     }
 *   }
 * });
 *
 * // Or validate existing config
 * const validated = ConfigSchema.parse(userConfig);
 * ```
 */

import { z } from "zod";

// ==================== Disk Configurations ====================

/**
 * Schema for local filesystem disk configuration.
 * Stores files on the local filesystem.
 */
const LocalDiskSchema = z.object({
  /** Disk driver type (must be "local"). */
  driver: z.literal("local"),
  /** Root directory for file storage (default: "uploads"). */
  root: z.string().default("uploads"),
  /** Public base URL for accessing files (default: "http://localhost:3000/uploads"). */
  public_base_url: z.string().default("http://localhost:3000/uploads"),
});

/**
 * Schema for Amazon S3 disk configuration.
 * Stores files on AWS S3 or S3-compatible services.
 */
const S3DiskSchema = z.object({
  /** Disk driver type (must be "s3"). */
  driver: z.literal("s3"),
  /** AWS access key ID. */
  key: z.string(),
  /** AWS secret access key. */
  secret: z.string(),
  /** AWS region (e.g., "us-east-1"). */
  region: z.string(),
  /** S3 bucket name. */
  bucket: z.string(),
  /** Optional root prefix for all files in bucket. */
  root: z.string().optional(),
  /** Optional custom public URL (if different from default S3 URL). */
  url: z.string().optional(),
  /** Optional custom endpoint for S3-compatible services (e.g., MinIO). */
  endpoint: z.string().optional(),
  /** Whether to use path-style URLs (required for some S3-compatible services). */
  use_path_style_endpoint: z.boolean().optional(),
});

/**
 * Schema for BunnyCDN disk configuration.
 * Stores files on BunnyCDN edge storage.
 */
const BunnyCDNDiskSchema = z.object({
  /** Disk driver type (must be "bunnycdn"). */
  driver: z.literal("bunnycdn"),
  /** BunnyCDN storage zone name. */
  storage_zone: z.string(),
  /** BunnyCDN API key for storage operations. */
  api_key: z.string(),
  /** BunnyCDN pull zone domain for public URLs. */
  pull_zone: z.string(),
  /** Optional root prefix for all files. */
  root: z.string().optional(),
  /** Optional region code (default: "de" for Germany). */
  region: z.string().optional(),
});

/**
 * Union schema for all disk configuration types.
 * Supports local, S3, and BunnyCDN storage drivers.
 */
const DiskConfigSchema = z.union([
  LocalDiskSchema,
  S3DiskSchema,
  BunnyCDNDiskSchema,
]);

// ==================== Limits ====================

/**
 * Schema for file size and upload limits.
 */
const LimitsSchema = z.object({
  /** Maximum file size in bytes (default: 10MB). */
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB default
});

// ==================== Security ====================

/**
 * Schema for security and MIME type restrictions.
 */
const SecuritySchema = z.object({
  /** Array of allowed MIME types (empty array = all allowed). */
  allowedMime: z.array(z.string()).default([]),
  /** Array of forbidden MIME types (blacklist). */
  forbiddenMime: z.array(z.string()).default([]),
});

// ==================== URL Configuration ====================

/**
 * Schema for URL generation and signing configuration.
 */
const UrlsSchema = z.object({
  /** URL prefix to prepend to all file URLs. */
  prefix: z.string().default(""),
  /** Whether to include version query parameter in URLs. */
  version: z.boolean().default(false),
  /** Whether URLs should be signed by default. */
  signedDefault: z.boolean().default(false),
  /** Temporary URL expiration time in seconds (default: 3600 = 1 hour). */
  temporaryUrlExpiry: z.number().default(3600), // 1 hour
});

// ==================== Image Conversions ====================

/**
 * Schema for image conversion and processing settings.
 */
const ConversionsSchema = z.object({
  /** Enable progressive JPEG encoding (default: true). */
  progressive: z.boolean().default(true),
  /** Default image quality (1-100, default: 85). */
  defaultQuality: z.number().min(1).max(100).default(85),
  /** Strip EXIF and other metadata from images (default: true). */
  stripMetadata: z.boolean().default(true),
});

// ==================== Responsive Images ====================

/**
 * Schema for responsive image generation settings.
 */
const ResponsiveImagesSchema = z.object({
  /** Whether responsive image generation is enabled. */
  enabled: z.boolean().default(false),
  /** Array of widths to generate for responsive images (in pixels). */
  widths: z.array(z.number()).default([640, 768, 1024, 1366, 1600, 1920]),
});

// ==================== Queue Configuration ====================

/**
 * Schema for async job queue configuration.
 */
const QueueConfigSchema = z.object({
  /** Queue driver type: "bullmq" (Redis) or "in-memory" (default: "in-memory"). */
  driver: z.enum(["bullmq", "in-memory"]).default("in-memory"),
  /** Queue name for job identification (default: "media-conversions"). */
  name: z.string().default("media-conversions"),
  /** Redis connection configuration (required for BullMQ driver). */
  redis: z
    .object({
      /** Redis server hostname (default: "localhost"). */
      host: z.string().default("localhost"),
      /** Redis server port (default: 6379). */
      port: z.number().default(6379),
      /** Optional Redis password for authentication. */
      password: z.string().optional(),
      /** Optional Redis database number. */
      db: z.number().optional(),
    })
    .optional(),
});

// ==================== File Naming ====================

/**
 * Schema for file naming strategy configuration.
 */
const FileNamingSchema = z.object({
  /** File naming strategy: "random" (default), "original", or "uuid". */
  strategy: z.enum(["random", "original", "uuid"]).default("random"),
});

// ==================== Path Generation ====================

/**
 * Schema for file path generation strategy configuration.
 */
const PathGenerationSchema = z.object({
  /** Path generation strategy: "default" (default), "date-based", "flat", or "simple". */
  strategy: z
    .enum(["default", "date-based", "flat", "simple"])
    .default("default"),
});

// ==================== Logging ====================

/**
 * Schema for logging configuration.
 * Supports both hierarchical level filtering and per-level enablement.
 */
const LoggingSchema = z.object({
  /** Whether logging is enabled (default: false). */
  enabled: z.boolean().default(false),
  /** Single log level for hierarchical filtering (backward compatible). */
  level: z.enum(["debug", "info", "warn", "error"]).default("info").optional(),
  /** Per-level enablement flags for granular control. */
  levels: z
    .object({
      /** Enable debug logs. */
      debug: z.boolean().default(false),
      /** Enable info logs. */
      info: z.boolean().default(true),
      /** Enable warning logs. */
      warn: z.boolean().default(true),
      /** Enable error logs. */
      error: z.boolean().default(true),
    })
    .optional(),
});

// ==================== Media Downloader ====================

/**
 * Schema for media downloader configuration (for attachFromUrl).
 */
const MediaDownloaderSchema = z.object({
  /** Request timeout in milliseconds (default: 30000 = 30 seconds). */
  timeout: z.number().default(30000),
  /** Maximum number of redirects to follow (default: 5). */
  maxRedirects: z.number().default(5),
  /** Maximum file size to download in bytes (default: 10MB). */
  maxFileSize: z.number().default(10 * 1024 * 1024),
});

// ==================== Main Config Schema ====================

/**
 * Main configuration schema for Media Drive.
 * Validates the entire configuration tree with all defaults applied.
 * Use ConfigSchema.parse() to validate user configuration.
 *
 * @example
 * ```typescript
 * import { ConfigSchema } from "./config/schema";
 *
 * const config = ConfigSchema.parse({
 *   disk: "s3",
 *   disks: {
 *     s3: { driver: "s3", key: "...", secret: "...", region: "...", bucket: "..." }
 *   }
 * });
 * ```
 */
export const ConfigSchema = z.object({
  /** Default disk name to use (must exist in disks object). */
  disk: z.string().default("local"),

  /** Map of disk configurations keyed by disk name. */
  disks: z.record(z.string(), DiskConfigSchema).default({
    local: {
      driver: "local" as const,
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
  }),

  /** File size and upload limits configuration. */
  limits: LimitsSchema.default({}),
  /** Security and MIME type restrictions configuration. */
  security: SecuritySchema.default({}),
  /** URL generation and signing configuration. */
  urls: UrlsSchema.default({}),
  /** Image conversion and processing settings. */
  conversions: ConversionsSchema.default({}),
  /** Responsive image generation settings. */
  responsiveImages: ResponsiveImagesSchema.default({}),
  /** Async job queue configuration. */
  queue: QueueConfigSchema.default({}),
  /** File naming strategy configuration. */
  fileNaming: FileNamingSchema.default({}),
  /** File path generation strategy configuration. */
  pathGeneration: PathGenerationSchema.default({}),
  /** Logging configuration. */
  logging: LoggingSchema.default({}),
  /** Media downloader configuration (for attachFromUrl). */
  mediaDownloader: MediaDownloaderSchema.default({}),

  /** Provider overrides for advanced usage (inject custom implementations). */
  providers: z
    .object({
      /** Custom storage driver implementation. */
      storageDriver: z.any().optional(),
      /** Custom conversion processor implementation. */
      conversionProcessor: z.any().optional(),
      /** Custom queue driver implementation. */
      queueDriver: z.any().optional(),
      /** Custom path generator implementation. */
      pathGenerator: z.any().optional(),
      /** Custom file namer implementation. */
      fileNamer: z.any().optional(),
      /** Custom URL signer implementation. */
      urlSigner: z.any().optional(),
    })
    .optional(),
});

// ==================== Type Inference ====================

/**
 * Complete media library configuration type (inferred from ConfigSchema).
 * All properties have defaults applied and are fully typed.
 */
export type MediaConfig = z.infer<typeof ConfigSchema>;

/**
 * Disk configuration type (union of all disk types).
 */
export type DiskConfig = z.infer<typeof DiskConfigSchema>;

/**
 * Local filesystem disk configuration type.
 */
export type LocalDisk = z.infer<typeof LocalDiskSchema>;

/**
 * Amazon S3 disk configuration type.
 */
export type S3Disk = z.infer<typeof S3DiskSchema>;

/**
 * BunnyCDN disk configuration type.
 */
export type BunnyCDNDisk = z.infer<typeof BunnyCDNDiskSchema>;

/**
 * File size limits configuration type.
 */
export type LimitsConfig = z.infer<typeof LimitsSchema>;

/**
 * Security and MIME type restrictions configuration type.
 */
export type SecurityConfig = z.infer<typeof SecuritySchema>;

/**
 * URL generation and signing configuration type.
 */
export type UrlsConfig = z.infer<typeof UrlsSchema>;

/**
 * Image conversion settings configuration type.
 */
export type ConversionsConfig = z.infer<typeof ConversionsSchema>;

/**
 * Responsive image generation configuration type.
 */
export type ResponsiveImagesConfig = z.infer<typeof ResponsiveImagesSchema>;

/**
 * Async job queue configuration type.
 */
export type QueueConfig = z.infer<typeof QueueConfigSchema>;

/**
 * File naming strategy configuration type.
 */
export type FileNamingConfig = z.infer<typeof FileNamingSchema>;

/**
 * Path generation strategy configuration type.
 */
export type PathGenerationConfig = z.infer<typeof PathGenerationSchema>;

/**
 * Logging configuration type.
 */
export type LoggingConfig = z.infer<typeof LoggingSchema>;

/**
 * Media downloader configuration type.
 */
export type MediaDownloaderConfig = z.infer<typeof MediaDownloaderSchema>;

// ==================== Enum Types ====================

/**
 * Supported storage driver types.
 */
export type DiskDriverType = "local" | "s3" | "bunnycdn";

/**
 * Supported queue driver types.
 */
export type QueueDriverType = "bullmq" | "in-memory";

/**
 * Supported file naming strategies.
 */
export type FileNamingStrategy = "random" | "original" | "uuid";

/**
 * Supported path generation strategies.
 */
export type PathGenerationStrategy =
  | "default"
  | "date-based"
  | "flat"
  | "simple";

/**
 * Supported image formats for conversions.
 */
export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

// ==================== Helper to Create Config ====================

/**
 * Type-safe configuration definition helper.
 * Validates and returns fully typed configuration with defaults applied.
 *
 * @param config - Partial configuration object (will be merged with defaults).
 * @returns Validated and complete MediaConfig with all defaults applied.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "./config/schema";
 *
 * const config = defineConfig({
 *   disk: "s3",
 *   disks: {
 *     s3: {
 *       driver: "s3",
 *       key: process.env.AWS_KEY!,
 *       secret: process.env.AWS_SECRET!,
 *       region: "us-east-1",
 *       bucket: "my-bucket"
 *     }
 *   },
 *   conversions: {
 *     defaultQuality: 90
 *   }
 * });
 * ```
 */
export function defineConfig<const T extends Partial<MediaConfig>>(
  config: T
): MediaConfig {
  return ConfigSchema.parse(config);
}
