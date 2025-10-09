/**
 * Media Drive Factory
 *
 * Creates and configures the MediaLibrary with all dependencies
 */

import { PrismaClient } from "@prisma/client";
import { MediaLibrary } from "./media/media-library";
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

export interface CreateMediaLibraryOptions {
  /**
   * Partial configuration (will be merged with defaults and env)
   */
  config?: Partial<MediaConfig> | undefined;

  /**
   * Prisma client instance (if not provided, creates new instance)
   */
  prisma?: PrismaClient | undefined;

  /**
   * Override default providers
   */
  providers?:
    | {
        storageDriver?: StorageDriver | undefined;
        conversionProcessor?: ConversionProcessor | undefined;
        queueDriver?: QueueDriver | undefined;
        pathGenerator?: PathGenerator | undefined;
        fileNamer?: FileNamer | undefined;
      }
    | undefined;
}

/**
 * Create a MediaLibrary instance with full DI setup
 */
export function createMediaLibrary(
  options: CreateMediaLibraryOptions = {}
): MediaLibrary {
  // Load and validate config
  const config = loadConfig(options.config);

  // Setup logger
  setLogger(createLogger(config.logging.level));

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
