/**
 * Configuration Loader
 *
 * Loads, validates, and merges configuration from multiple sources.
 * Supports environment variables and user-provided configuration with proper precedence.
 */

import { ConfigSchema, MediaConfig } from "./schema";
import { ConfigurationError } from "../core/errors";
import { getLogger } from "../core/logger";

const logger = getLogger();

/**
 * Load configuration from environment variables.
 * Reads standard environment variable names and converts them to config format.
 *
 * @returns Partial configuration object from environment variables.
 *
 * @example
 * // Environment variables:
 * // MEDIA_DISK=local
 * // MEDIA_LOG_LEVEL=debug
 * // S3_KEY=xxx S3_SECRET=yyy S3_BUCKET=mybucket
 * const envConfig = loadFromEnv();
 */
function loadFromEnv(): Partial<MediaConfig> {
  const env = process.env;
  const config: Partial<MediaConfig> = {};

  if (env["MEDIA_DISK"]) {
    config.disk = env["MEDIA_DISK"];
  }

  if (env["MEDIA_LOG_LEVEL"]) {
    config.logging = {
      level: env["MEDIA_LOG_LEVEL"] as "debug" | "info" | "warn" | "error",
      enabled: true,
    };
  }

  if (env["MEDIA_LOG_ENABLED"]) {
    config.logging = {
      level: "info",
      enabled: env["MEDIA_LOG_ENABLED"] === "true",
    };
  }

  if (env["MEDIA_MAX_FILE_SIZE"]) {
    config.limits = {
      maxFileSize: parseInt(env["MEDIA_MAX_FILE_SIZE"], 10),
    };
  }

  // S3 configuration
  if (env["S3_KEY"] && env["S3_SECRET"] && env["S3_BUCKET"]) {
    if (!config.disks) config.disks = {};
    config.disks["s3"] = {
      driver: "s3",
      key: env["S3_KEY"],
      secret: env["S3_SECRET"],
      region: env["S3_REGION"] || "us-east-1",
      bucket: env["S3_BUCKET"],
      root: env["S3_ROOT"],
      url: env["S3_URL"],
      endpoint: env["S3_ENDPOINT"],
      use_path_style_endpoint: env["S3_USE_PATH_STYLE"] === "true",
    };
  }

  // BunnyCDN configuration
  if (
    env["BUNNY_STORAGE_ZONE"] &&
    env["BUNNY_API_KEY"] &&
    env["BUNNY_PULL_ZONE"]
  ) {
    if (!config.disks) config.disks = {};
    config.disks["bunnycdn"] = {
      driver: "bunnycdn",
      storage_zone: env["BUNNY_STORAGE_ZONE"],
      api_key: env["BUNNY_API_KEY"],
      pull_zone: env["BUNNY_PULL_ZONE"],
      root: env["BUNNY_ROOT"],
      region: env["BUNNY_REGION"],
    };
  }

  // Redis/Queue configuration
  if (env["REDIS_HOST"]) {
    config.queue = {
      driver: "bullmq",
      name: env["QUEUE_NAME"] || "media-conversions",
      redis: {
        host: env["REDIS_HOST"],
        port: env["REDIS_PORT"] ? parseInt(env["REDIS_PORT"], 10) : 6379,
        password: env["REDIS_PASSWORD"],
        db: env["REDIS_DB"] ? parseInt(env["REDIS_DB"], 10) : undefined,
      },
    };
  }

  return config;
}

/**
 * Load, validate, and merge configuration from multiple sources.
 * Merges environment variables and user config with proper precedence (user config wins).
 * Validates the final configuration using Zod schema.
 *
 * @param userConfig - User-provided partial configuration (takes precedence over env).
 * @returns Validated and merged MediaConfig object.
 * @throws {ConfigurationError} If configuration validation fails.
 *
 * @example
 * ```typescript
 * const config = loadConfig({
 *   disk: "s3",
 *   disks: {
 *     s3: { driver: "s3", key: "...", secret: "...", bucket: "..." }
 *   }
 * });
 * ```
 */
export function loadConfig(userConfig: Partial<MediaConfig> = {}): MediaConfig {
  try {
    // Load from environment
    const envConfig = loadFromEnv();

    // Merge: user config takes precedence over env
    const merged = {
      ...envConfig,
      ...userConfig,
      disks: {
        ...envConfig.disks,
        ...userConfig.disks,
      },
    };

    // Validate with Zod
    const validated = ConfigSchema.parse(merged);

    logger.debug("Configuration loaded and validated", {
      disk: validated.disk,
      disksConfigured: Object.keys(validated.disks),
    });

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigurationError(`Invalid configuration: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate a partial configuration without loading from environment.
 * Useful for validating user-provided config before merging.
 *
 * @param config - Partial configuration to validate.
 * @returns Validated MediaConfig object.
 * @throws {ConfigurationError} If configuration validation fails.
 */
export function validateConfig(config: Partial<MediaConfig>): MediaConfig {
  return ConfigSchema.parse(config);
}
