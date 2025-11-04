/**
 * Configuration Schema with Zod
 *
 * Provides runtime validation and type inference for all configuration
 */

import { z } from "zod";

// ==================== Disk Configurations ====================

const LocalDiskSchema = z.object({
  driver: z.literal("local"),
  root: z.string().default("uploads"),
  public_base_url: z.string().default("http://localhost:3000/uploads"),
});

const S3DiskSchema = z.object({
  driver: z.literal("s3"),
  key: z.string(),
  secret: z.string(),
  region: z.string(),
  bucket: z.string(),
  root: z.string().optional(),
  url: z.string().optional(),
  endpoint: z.string().optional(),
  use_path_style_endpoint: z.boolean().optional(),
});

const BunnyCDNDiskSchema = z.object({
  driver: z.literal("bunnycdn"),
  storage_zone: z.string(),
  api_key: z.string(),
  pull_zone: z.string(),
  root: z.string().optional(),
  region: z.string().optional(),
});

const DiskConfigSchema = z.union([
  LocalDiskSchema,
  S3DiskSchema,
  BunnyCDNDiskSchema,
]);

// ==================== Limits ====================

const LimitsSchema = z.object({
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB default
});

// ==================== Security ====================

const SecuritySchema = z.object({
  allowedMime: z.array(z.string()).default([]),
  forbiddenMime: z.array(z.string()).default([]),
});

// ==================== URL Configuration ====================

const UrlsSchema = z.object({
  prefix: z.string().default(""),
  version: z.boolean().default(false),
  signedDefault: z.boolean().default(false),
  temporaryUrlExpiry: z.number().default(3600), // 1 hour
});

// ==================== Image Conversions ====================

const ConversionsSchema = z.object({
  progressive: z.boolean().default(true),
  defaultQuality: z.number().min(1).max(100).default(85),
  stripMetadata: z.boolean().default(true),
});

// ==================== Responsive Images ====================

const ResponsiveImagesSchema = z.object({
  enabled: z.boolean().default(false),
  widths: z.array(z.number()).default([640, 768, 1024, 1366, 1600, 1920]),
});

// ==================== Queue Configuration ====================

const QueueConfigSchema = z.object({
  driver: z.enum(["bullmq", "in-memory"]).default("in-memory"),
  name: z.string().default("media-conversions"),
  redis: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().default(6379),
      password: z.string().optional(),
      db: z.number().optional(),
    })
    .optional(),
});

// ==================== File Naming ====================

const FileNamingSchema = z.object({
  strategy: z.enum(["random", "original", "uuid"]).default("random"),
});

// ==================== Path Generation ====================

const PathGenerationSchema = z.object({
  strategy: z
    .enum(["default", "date-based", "flat", "simple"])
    .default("default"),
});

// ==================== Logging ====================

const LoggingSchema = z.object({
  enabled: z.boolean().default(false),
  // Option 1: Keep single level (backward compatible)
  level: z.enum(["debug", "info", "warn", "error"]).default("info").optional(),
  // Option 2: Add individual level toggles
  levels: z
    .object({
      debug: z.boolean().default(false),
      info: z.boolean().default(true),
      warn: z.boolean().default(true),
      error: z.boolean().default(true),
    })
    .optional(),
});

// ==================== Media Downloader ====================

const MediaDownloaderSchema = z.object({
  timeout: z.number().default(30000),
  maxRedirects: z.number().default(5),
  maxFileSize: z.number().default(10 * 1024 * 1024),
});

// ==================== Main Config Schema ====================

export const ConfigSchema = z.object({
  disk: z.string().default("local"),

  disks: z.record(z.string(), DiskConfigSchema).default({
    local: {
      driver: "local" as const,
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
  }),

  limits: LimitsSchema.default({}),
  security: SecuritySchema.default({}),
  urls: UrlsSchema.default({}),
  conversions: ConversionsSchema.default({}),
  responsiveImages: ResponsiveImagesSchema.default({}),
  queue: QueueConfigSchema.default({}),
  fileNaming: FileNamingSchema.default({}),
  pathGeneration: PathGenerationSchema.default({}),
  logging: LoggingSchema.default({}),
  mediaDownloader: MediaDownloaderSchema.default({}),

  // Provider overrides (advanced usage)
  providers: z
    .object({
      storageDriver: z.any().optional(),
      conversionProcessor: z.any().optional(),
      queueDriver: z.any().optional(),
      pathGenerator: z.any().optional(),
      fileNamer: z.any().optional(),
      urlSigner: z.any().optional(),
    })
    .optional(),
});

// ==================== Type Inference ====================

export type MediaConfig = z.infer<typeof ConfigSchema>;
export type DiskConfig = z.infer<typeof DiskConfigSchema>;
export type LocalDisk = z.infer<typeof LocalDiskSchema>;
export type S3Disk = z.infer<typeof S3DiskSchema>;
export type BunnyCDNDisk = z.infer<typeof BunnyCDNDiskSchema>;
export type LimitsConfig = z.infer<typeof LimitsSchema>;
export type SecurityConfig = z.infer<typeof SecuritySchema>;
export type UrlsConfig = z.infer<typeof UrlsSchema>;
export type ConversionsConfig = z.infer<typeof ConversionsSchema>;
export type ResponsiveImagesConfig = z.infer<typeof ResponsiveImagesSchema>;
export type QueueConfig = z.infer<typeof QueueConfigSchema>;
export type FileNamingConfig = z.infer<typeof FileNamingSchema>;
export type PathGenerationConfig = z.infer<typeof PathGenerationSchema>;
export type LoggingConfig = z.infer<typeof LoggingSchema>;
export type MediaDownloaderConfig = z.infer<typeof MediaDownloaderSchema>;

// ==================== Enum Types ====================

export type DiskDriverType = "local" | "s3" | "bunnycdn";
export type QueueDriverType = "bullmq" | "in-memory";
export type FileNamingStrategy = "random" | "original" | "uuid";
export type PathGenerationStrategy =
  | "default"
  | "date-based"
  | "flat"
  | "simple";
export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

// ==================== Helper to Create Config ====================

export function defineConfig<const T extends Partial<MediaConfig>>(
  config: T
): MediaConfig {
  return ConfigSchema.parse(config);
}
