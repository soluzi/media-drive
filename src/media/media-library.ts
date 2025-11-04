/**
 * MediaLibrary - Main Service Orchestrator
 *
 * Thin orchestrator that coordinates file operations, conversions, and database records
 */

import { PrismaClient, Prisma } from "@prisma/client";
import axios from "axios";
import {
  StorageDriver,
  ConversionProcessor,
  QueueDriver,
  PathGenerator,
  FileNamer,
  ConversionOptions,
  ConversionJobData,
} from "../core/contracts";
import { MediaConfig } from "../config/schema";
import { FileService } from "./file-service";
import { UrlService } from "./url-service";
import { NotFoundError, ConfigurationError } from "../core/errors";
import { getLogger } from "../core/logger";
import { Readable } from "stream";
import { MediaRecord, AttachFileOptions, AttachFromUrlOptions } from "../types";
import { createStorageDriver } from "../storage/storage-factory";

const logger = getLogger();

/**
 * Main MediaLibrary Service
 */
export class MediaLibrary {
  private fileService: FileService;
  private urlService: UrlService;
  private storageDriverCache: Map<string, StorageDriver> = new Map();

  constructor(
    private config: MediaConfig,
    private prisma: PrismaClient,
    _storage: StorageDriver,
    private pathGenerator: PathGenerator,
    _fileNamer: FileNamer,
    _conversionProcessor?: ConversionProcessor | undefined,
    private queueDriver?: QueueDriver | undefined
  ) {
    // Cache the default storage driver
    this.storageDriverCache.set(config.disk, _storage);

    this.fileService = new FileService(
      config,
      _storage,
      pathGenerator,
      _fileNamer,
      _conversionProcessor
    );
    this.urlService = new UrlService(config, _storage);
  }

  /**
   * Get storage driver for a specific disk
   * Caches drivers to avoid recreating them
   */
  private getStorageDriver(diskName: string): StorageDriver {
    // Check cache first
    const cached = this.storageDriverCache.get(diskName);
    if (cached) {
      return cached;
    }

    // Validate disk exists in configuration
    const diskConfig = this.config.disks[diskName];
    if (!diskConfig) {
      throw new ConfigurationError(`Disk configuration not found: ${diskName}`);
    }

    // Create and cache the driver
    const driver = createStorageDriver(diskConfig);
    this.storageDriverCache.set(diskName, driver);

    return driver;
  }

  /**
   * Attach a file to a model
   */
  async attachFile(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options: AttachFileOptions = {}
  ): Promise<MediaRecord> {
    const {
      collection = "default",
      name = file.originalname,
      disk = this.config.disk,
      conversions = {},
      customProperties = {},
    } = options;

    logger.info(`Attaching file for ${modelType}:${modelId}`, {
      collection,
      originalName: file.originalname,
      disk,
    });

    // Get the storage driver for the specified disk
    const storageDriver = this.getStorageDriver(disk);

    // Upload file using the correct storage driver
    const result = await this.fileService.upload(
      {
        modelType,
        modelId,
        collection,
        originalName: file.originalname,
        buffer: file.buffer,
      },
      conversions,
      storageDriver
    );

    // Create database record with stored path
    const mediaRecord = await this.prisma.media.create({
      data: {
        path: result.path,
        model_type: modelType,
        model_id: modelId,
        collection_name: collection,
        name,
        file_name: result.fileName,
        mime_type: result.mimeType,
        disk,
        size: result.size,
        manipulations: conversions as Prisma.JsonObject, // Prisma.Json type compatibility
        custom_properties: customProperties as Prisma.JsonObject, // Prisma.Json type compatibility
        responsive_images: result.conversions as Prisma.JsonObject, // Prisma.Json type compatibility
      },
    });

    logger.info(`Media record created: ${mediaRecord.id}`);
    return mediaRecord as MediaRecord;
  }

  /**
   * Attach a file from URL
   */
  async attachFromUrl(
    modelType: string,
    modelId: string,
    url: string,
    options: AttachFromUrlOptions = {}
  ): Promise<MediaRecord> {
    const {
      collection = "default",
      name,
      disk,
      conversions = {},
      customProperties = {},
      headers = {},
      timeout = this.config.mediaDownloader.timeout,
    } = options;

    logger.info(`Downloading file from URL for ${modelType}:${modelId}`, {
      url,
    });

    // Download file
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers,
      timeout,
      maxRedirects: this.config.mediaDownloader.maxRedirects,
    });

    const buffer = Buffer.from(response.data);
    const originalName = name || this.extractFileNameFromUrl(url) || "download";

    // Create mock Multer file
    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: originalName,
      encoding: "7bit",
      mimetype: response.headers["content-type"] || "application/octet-stream",
      buffer,
      size: buffer.length,
      destination: "",
      filename: "",
      path: "",
      stream: {} as Readable,
    };

    return this.attachFile(modelType, modelId, file, {
      collection,
      name: name,
      disk,
      conversions,
      customProperties,
    });
  }

  /**
   * List media for a model
   */
  async list(
    modelType: string,
    modelId: string,
    collection?: string | undefined
  ): Promise<MediaRecord[]> {
    const where: {
      model_type: string;
      model_id: string;
      collection_name?: string;
    } = {
      model_type: modelType,
      model_id: modelId,
    };

    if (collection) {
      where.collection_name = collection;
    }

    const records = await this.prisma.media.findMany({
      where,
      orderBy: { order_column: "asc" },
    });

    return records as MediaRecord[];
  }

  /**
   * Remove media
   */
  async remove(mediaId: string): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundError(`Media with ID ${mediaId} not found`);
    }

    // Extract conversion paths
    const conversionPaths: string[] = [];
    if (media.responsive_images) {
      const conversions = media.responsive_images as Record<string, any>;
      for (const conversion of Object.values(conversions)) {
        if (conversion.path) {
          conversionPaths.push(conversion.path);
        }
      }
    }

    // Use stored path from database (works with any path generator)
    let originalPath: string = media.path || "";

    // Fallback for backward compatibility with existing records
    if (!originalPath) {
      logger.warn(
        `Media ${mediaId} has no stored path, regenerating for deletion (this may fail with non-deterministic path generators)`
      );

      // Try to regenerate path (only works with deterministic generators)
      originalPath = this.pathGenerator.generate({
        modelType: media.model_type,
        modelId: media.model_id,
        collection: media.collection_name,
        originalName: media.file_name,
        fileName: media.file_name,
      }).path;
    }

    // Get the storage driver for the disk specified in the media record
    const disk = media.disk || this.config.disk;
    const storageDriver = this.getStorageDriver(disk);

    // Delete files using the correct storage driver
    await this.fileService.delete(originalPath, conversionPaths, storageDriver);

    // Delete database record
    await this.prisma.media.delete({
      where: { id: mediaId },
    });

    logger.info(`Media removed: ${mediaId}`);
  }

  /**
   * Resolve file URL
   */
  async resolveFileUrl(
    mediaId: string,
    conversion?: string | undefined,
    signed: boolean = false
  ): Promise<string> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundError(`Media with ID ${mediaId} not found`);
    }

    let path: string;

    if (conversion && media.responsive_images) {
      const conversions = media.responsive_images as Record<string, any>;
      if (!conversions[conversion]) {
        throw new NotFoundError(
          `Conversion '${conversion}' not found for media ${mediaId}`
        );
      }
      path = conversions[conversion].path;
    } else {
      // Use stored path from database (works with any path generator)
      path = media.path || "";

      // Fallback for backward compatibility with existing records
      if (!path) {
        logger.warn(
          `Media ${mediaId} has no stored path, regenerating (this may fail with non-deterministic path generators)`
        );

        // Try to regenerate path (only works with deterministic generators)
        path = this.pathGenerator.generate({
          modelType: media.model_type,
          modelId: media.model_id,
          collection: media.collection_name,
          originalName: media.file_name,
          fileName: media.file_name,
        }).path;
      }
    }

    // Get the storage driver for the disk specified in the media record
    const disk = media.disk || this.config.disk;
    const storageDriver = this.getStorageDriver(disk);

    return await this.urlService.resolveUrl(path, signed, storageDriver);
  }

  /**
   * Process conversions asynchronously
   */
  async processConversionsAsync(
    mediaId: string,
    conversions: Record<string, ConversionOptions>
  ): Promise<string> {
    if (!this.queueDriver) {
      throw new Error("Queue driver not configured");
    }

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundError(`Media with ID ${mediaId} not found`);
    }

    const jobData: ConversionJobData = {
      mediaId,
      conversions,
      originalPath: this.pathGenerator.generate({
        modelType: media.model_type,
        modelId: media.model_id,
        collection: media.collection_name,
        originalName: media.file_name,
        fileName: media.file_name,
      }).path,
      modelType: media.model_type,
      modelId: media.model_id,
      collectionName: media.collection_name,
      fileName: media.file_name,
      disk: media.disk,
    };

    const jobId = await this.queueDriver.enqueue(jobData);
    logger.info(`Conversion job enqueued: ${jobId}`, { mediaId });
    return jobId;
  }

  /**
   * Get conversion job status
   */
  async getConversionJobStatus(jobId: string): Promise<any> {
    if (!this.queueDriver) {
      throw new Error("Queue driver not configured");
    }

    return await this.queueDriver.status(jobId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    if (!this.queueDriver) {
      throw new Error("Queue driver not configured");
    }

    return await this.queueDriver.stats();
  }

  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop();
      return fileName || "download";
    } catch {
      return "download";
    }
  }
}
