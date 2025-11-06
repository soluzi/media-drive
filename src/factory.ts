/**
 * Media Drive Factory
 *
 * Creates and configures MediaLibrary instances with full dependency injection setup.
 * Handles provider resolution, configuration loading, and dependency registration.
 * Provides factory functions for both standard and enhanced media library instances.
 */

import { PrismaClient } from "@prisma/client";
import { MediaLibrary } from "./media/media-library";
import {
  EnhancedMediaLibrary,
  EnhancedMediaLibraryConfig,
} from "./media/enhanced-media-library";
import { MediaConfig, loadConfig } from "./config";
import { createStorageDriver } from "./storage";
import { SharpProcessor } from "./conversions";
import { BullMQDriver, InMemoryQueueDriver } from "./queue";
import { createPathGenerator } from "./strategies/path-generators";
import { createFileNamer } from "./strategies/file-namers";
import { setLogger, createLogger } from "./core/logger";
import { getRegistry, TOKENS } from "./registry";
import {
  StorageDriver,
  ConversionProcessor,
  QueueDriver,
  PathGenerator,
  FileNamer,
} from "./core/contracts";

/**
 * Options for creating a MediaLibrary instance.
 * Allows customization of configuration, Prisma client, and provider implementations.
 */
export interface CreateMediaLibraryOptions {
  /**
   * Partial configuration that will be merged with defaults and environment variables.
   * User config takes precedence over environment variables.
   */
  config?: Partial<MediaConfig> | undefined;

  /**
   * Prisma client instance for database operations.
   * If not provided, a new PrismaClient instance will be created.
   */
  prisma?: PrismaClient | undefined;

  /**
   * Override default provider implementations.
   * Allows injecting custom storage drivers, conversion processors, queue drivers, etc.
   * Provider resolution order: options.providers > config.providers > defaults.
   */
  providers?:
    | {
        /** Custom storage driver (overrides config-based driver creation). */
        storageDriver?: StorageDriver | undefined;
        /** Custom conversion processor (overrides SharpProcessor default). */
        conversionProcessor?: ConversionProcessor | undefined;
        /** Custom queue driver (overrides config-based queue driver creation). */
        queueDriver?: QueueDriver | undefined;
        /** Custom path generator (overrides config-based path generator creation). */
        pathGenerator?: PathGenerator | undefined;
        /** Custom file namer (overrides config-based file namer creation). */
        fileNamer?: FileNamer | undefined;
      }
    | undefined;
}

/**
 * Create a MediaLibrary instance with full dependency injection setup.
 *
 * This factory function:
 * 1. Loads and validates configuration (merges user config with env vars)
 * 2. Sets up logging based on configuration
 * 3. Resolves or creates Prisma client
 * 4. Registers all dependencies in the DI registry
 * 5. Resolves providers (options > config > defaults)
 * 6. Creates and returns configured MediaLibrary instance
 *
 * Provider resolution follows this priority:
 * - `options.providers.*` (highest priority)
 * - `config.providers.*`
 * - Default implementations based on config (lowest priority)
 *
 * @param options - Creation options with optional config, Prisma client, and providers.
 * @returns Configured MediaLibrary instance ready to use.
 * @throws {Error} If disk configuration is not found or Redis is required but not configured for BullMQ.
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const mediaLibrary = createMediaLibrary();
 *
 * // With custom configuration
 * const mediaLibrary = createMediaLibrary({
 *   config: {
 *     disk: "s3",
 *     disks: {
 *       s3: { driver: "s3", key: "...", secret: "...", bucket: "..." }
 *     }
 *   }
 * });
 *
 * // With custom providers
 * const mediaLibrary = createMediaLibrary({
 *   providers: {
 *     storageDriver: myCustomStorageDriver,
 *     conversionProcessor: myCustomProcessor
 *   }
 * });
 * ```
 */
export function createMediaLibrary(
  options: CreateMediaLibraryOptions = {}
): MediaLibrary {
  // Load and validate config
  const config = loadConfig(options.config);

  // Setup logger
  if (!!config.logging) {
    setLogger(
      createLogger(
        config.logging.level,
        config.logging.levels,
        config.logging.enabled
      )
    );
  }

  // Get or create Prisma client
  const prisma = options.prisma || new PrismaClient();

  // Setup providers with fallbacks
  const registry = getRegistry();

  // Register config
  registry.registerInstance(TOKENS.CONFIG, config);
  registry.registerInstance(TOKENS.PRISMA, prisma);

  // Storage Driver
  let storageDriver: StorageDriver;
  if (options.providers?.storageDriver) {
    storageDriver = options.providers.storageDriver;
  } else if (config.providers?.storageDriver) {
    storageDriver = config.providers.storageDriver;
  } else {
    const diskConfig = config.disks[config.disk];
    if (!diskConfig) {
      throw new Error(`Disk configuration not found for: ${config.disk}`);
    }
    storageDriver = createStorageDriver(diskConfig);
  }
  registry.registerInstance(TOKENS.STORAGE_DRIVER, storageDriver);

  // Conversion Processor
  let conversionProcessor: ConversionProcessor | undefined;
  if (options.providers?.conversionProcessor) {
    conversionProcessor = options.providers.conversionProcessor;
  } else if (config.providers?.conversionProcessor) {
    conversionProcessor = config.providers.conversionProcessor;
  } else {
    conversionProcessor = new SharpProcessor({
      progressive: config.conversions.progressive,
      stripMetadata: config.conversions.stripMetadata,
      defaultQuality: config.conversions.defaultQuality,
    });
  }
  registry.registerInstance(TOKENS.CONVERSION_PROCESSOR, conversionProcessor);

  // Queue Driver
  let queueDriver: QueueDriver | undefined;
  if (options.providers?.queueDriver) {
    queueDriver = options.providers.queueDriver;
  } else if (config.providers?.queueDriver) {
    queueDriver = config.providers.queueDriver;
  } else {
    if (config.queue.driver === "bullmq") {
      if (!config.queue.redis) {
        throw new Error("Redis configuration required for BullMQ queue driver");
      }
      queueDriver = new BullMQDriver({
        name: config.queue.name,
        redis: {
          host: config.queue.redis.host,
          port: config.queue.redis.port,
          password: config.queue.redis.password,
          db: config.queue.redis.db,
        },
      });
    } else {
      queueDriver = new InMemoryQueueDriver();
    }
  }
  registry.registerInstance(TOKENS.QUEUE_DRIVER, queueDriver);

  // Path Generator
  let pathGenerator: PathGenerator;
  if (options.providers?.pathGenerator) {
    pathGenerator = options.providers.pathGenerator;
  } else if (config.providers?.pathGenerator) {
    pathGenerator = config.providers.pathGenerator;
  } else {
    pathGenerator = createPathGenerator(config.pathGeneration.strategy);
  }
  registry.registerInstance(TOKENS.PATH_GENERATOR, pathGenerator);

  // File Namer
  let fileNamer: FileNamer;
  if (options.providers?.fileNamer) {
    fileNamer = options.providers.fileNamer;
  } else if (config.providers?.fileNamer) {
    fileNamer = config.providers.fileNamer;
  } else {
    fileNamer = createFileNamer(config.fileNaming.strategy);
  }
  registry.registerInstance(TOKENS.FILE_NAMER, fileNamer);

  // Create MediaLibrary
  return new MediaLibrary(
    config,
    prisma,
    storageDriver,
    pathGenerator,
    fileNamer,
    conversionProcessor,
    queueDriver
  );
}

/**
 * Options for creating an EnhancedMediaLibrary instance.
 * EnhancedMediaLibrary includes built-in HTTP middleware and Express integration.
 * Extends CreateMediaLibraryOptions with enhanced-specific configuration.
 */
export interface CreateEnhancedMediaLibraryOptions {
  /**
   * Partial configuration that will be merged with defaults and environment variables.
   * Must include EnhancedMediaLibraryConfig properties for HTTP features.
   * User config takes precedence over environment variables.
   */
  config?: Partial<EnhancedMediaLibraryConfig> | undefined;

  /**
   * Prisma client instance for database operations.
   * If not provided, a new PrismaClient instance will be created.
   */
  prisma?: PrismaClient | undefined;

  /**
   * Override default provider implementations.
   * Allows injecting custom storage drivers, conversion processors, queue drivers, etc.
   * Provider resolution order: options.providers > config.providers > defaults.
   */
  providers?:
    | {
        /** Custom storage driver (overrides config-based driver creation). */
        storageDriver?: StorageDriver | undefined;
        /** Custom conversion processor (overrides SharpProcessor default). */
        conversionProcessor?: ConversionProcessor | undefined;
        /** Custom queue driver (overrides config-based queue driver creation). */
        queueDriver?: QueueDriver | undefined;
        /** Custom path generator (overrides config-based path generator creation). */
        pathGenerator?: PathGenerator | undefined;
        /** Custom file namer (overrides config-based file namer creation). */
        fileNamer?: FileNamer | undefined;
      }
    | undefined;
}

/**
 * Create an EnhancedMediaLibrary instance with built-in HTTP support.
 *
 * EnhancedMediaLibrary extends MediaLibrary with:
 * - Express middleware for file uploads
 * - Built-in validation
 * - HTTP error handling
 * - Progress tracking
 * - Streaming upload support
 *
 * This factory function follows the same provider resolution logic as `createMediaLibrary()`.
 * All dependencies are registered in the DI registry and the instance is ready for Express integration.
 *
 * @param options - Creation options with optional config, Prisma client, and providers.
 * @returns Configured EnhancedMediaLibrary instance with HTTP support ready to use.
 * @throws {Error} If disk configuration is not found or Redis is required but not configured for BullMQ.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const mediaLibrary = createEnhancedMediaLibrary();
 *
 * // Use with Express
 * const app = express();
 * app.use("/api/media", mediaLibrary.getRouter());
 *
 * // With custom configuration
 * const mediaLibrary = createEnhancedMediaLibrary({
 *   config: {
 *     disk: "s3",
 *     validation: {
 *       maxFileSize: 50 * 1024 * 1024, // 50MB
 *       allowedMimeTypes: ["image/jpeg", "image/png"]
 *     }
 *   }
 * });
 * ```
 */
export function createEnhancedMediaLibrary(
  options: CreateEnhancedMediaLibraryOptions = {}
): EnhancedMediaLibrary {
  // Load and validate config
  const config = loadConfig(options.config) as EnhancedMediaLibraryConfig;

  // Setup logger
  if (!!config.logging) {
    setLogger(
      createLogger(
        config.logging.level,
        config.logging.levels,
        config.logging.enabled
      )
    );
  }

  // Get or create Prisma client
  const prisma = options.prisma || new PrismaClient();

  // Setup providers with fallbacks
  const registry = getRegistry();

  // Register config
  registry.registerInstance(TOKENS.CONFIG, config);
  registry.registerInstance(TOKENS.PRISMA, prisma);

  // Storage Driver
  let storageDriver: StorageDriver;
  if (options.providers?.storageDriver) {
    storageDriver = options.providers.storageDriver;
  } else if (config.providers?.storageDriver) {
    storageDriver = config.providers.storageDriver;
  } else {
    const diskConfig = config.disks[config.disk];
    if (!diskConfig) {
      throw new Error(`Disk configuration not found for: ${config.disk}`);
    }
    storageDriver = createStorageDriver(diskConfig);
  }
  registry.registerInstance(TOKENS.STORAGE_DRIVER, storageDriver);

  // Conversion Processor
  let conversionProcessor: ConversionProcessor | undefined;
  if (options.providers?.conversionProcessor) {
    conversionProcessor = options.providers.conversionProcessor;
  } else if (config.providers?.conversionProcessor) {
    conversionProcessor = config.providers.conversionProcessor;
  } else {
    conversionProcessor = new SharpProcessor({
      progressive: config.conversions.progressive,
      stripMetadata: config.conversions.stripMetadata,
      defaultQuality: config.conversions.defaultQuality,
    });
  }
  registry.registerInstance(TOKENS.CONVERSION_PROCESSOR, conversionProcessor);

  // Queue Driver
  let queueDriver: QueueDriver | undefined;
  if (options.providers?.queueDriver) {
    queueDriver = options.providers.queueDriver;
  } else if (config.providers?.queueDriver) {
    queueDriver = config.providers.queueDriver;
  } else {
    if (config.queue.driver === "bullmq") {
      if (!config.queue.redis) {
        throw new Error("Redis configuration required for BullMQ queue driver");
      }
      queueDriver = new BullMQDriver({
        name: config.queue.name,
        redis: {
          host: config.queue.redis.host,
          port: config.queue.redis.port,
          password: config.queue.redis.password,
          db: config.queue.redis.db,
        },
      });
    } else {
      queueDriver = new InMemoryQueueDriver();
    }
  }
  registry.registerInstance(TOKENS.QUEUE_DRIVER, queueDriver);

  // Path Generator
  let pathGenerator: PathGenerator;
  if (options.providers?.pathGenerator) {
    pathGenerator = options.providers.pathGenerator;
  } else if (config.providers?.pathGenerator) {
    pathGenerator = config.providers.pathGenerator;
  } else {
    pathGenerator = createPathGenerator(config.pathGeneration.strategy);
  }
  registry.registerInstance(TOKENS.PATH_GENERATOR, pathGenerator);

  // File Namer
  let fileNamer: FileNamer;
  if (options.providers?.fileNamer) {
    fileNamer = options.providers.fileNamer;
  } else if (config.providers?.fileNamer) {
    fileNamer = config.providers.fileNamer;
  } else {
    fileNamer = createFileNamer(config.fileNaming.strategy);
  }
  registry.registerInstance(TOKENS.FILE_NAMER, fileNamer);

  // Create Enhanced MediaLibrary
  return new EnhancedMediaLibrary(
    config,
    prisma,
    storageDriver,
    pathGenerator,
    fileNamer,
    conversionProcessor,
    queueDriver
  );
}
