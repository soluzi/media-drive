/**
 * File Service
 *
 * Internal service for file operations.
 * Handles file uploads, conversions, and deletions.
 */

import {
  StorageDriver,
  ConversionProcessor,
  PathGenerator,
  FileNamer,
  ConversionOptions,
} from "../core/contracts";
import { detectMimeType } from "./file-type-detector";
import { isImageMimeType } from "./file-type-detector";
import { MediaConfig } from "../config/schema";
import { getLogger } from "../core/logger";
import { getMimeTypeForFormat } from "../conversions/helpers";

const logger = getLogger();

/**
 * Context information for file upload operations.
 */
export interface FileUploadContext {
  /** Model type (e.g., "User", "Post"). */
  modelType: string;
  /** Model instance ID. */
  modelId: string;
  /** Collection name. */
  collection: string;
  /** Original uploaded filename. */
  originalName: string;
  /** File contents as Buffer. */
  buffer: Buffer;
}

/**
 * Result of a file upload operation.
 */
export interface UploadResult {
  /** Generated filename. */
  fileName: string;
  /** Storage path where file was saved. */
  path: string;
  /** File size in bytes. */
  size: number;
  /** Detected MIME type. */
  mimeType: string;
  /** Map of conversion names to their storage paths and sizes. */
  conversions: Record<string, { path: string; size: number }>;
  /** Generated mediaId (for simple path strategy). */
  mediaId?: string;
}

/**
 * File service for handling file operations.
 * Manages uploads, conversions, and deletions.
 */
export class FileService {
  /**
   * Creates a new FileService instance.
   *
   * @param config - Media library configuration.
   * @param storage - Default storage driver.
   * @param pathGenerator - Path generator for organizing files.
   * @param fileNamer - File namer for generating filenames.
   * @param conversionProcessor - Optional image conversion processor.
   */
  constructor(
    private config: MediaConfig,
    private storage: StorageDriver,
    private pathGenerator: PathGenerator,
    private fileNamer: FileNamer,
    private conversionProcessor?: ConversionProcessor | undefined
  ) {}

  /**
   * Upload a file with optional conversions.
   * Detects MIME type, validates file size, generates path, stores file, and processes conversions.
   *
   * @param ctx - File upload context with model and file information.
   * @param conversions - Map of conversion names to their options.
   * @param storageDriver - Optional storage driver override (uses default if not provided).
   * @returns Promise resolving to upload result with paths and metadata.
   * @throws {Error} If file size exceeds limits or upload fails.
   */
  async upload(
    ctx: FileUploadContext,
    conversions: Record<string, ConversionOptions> = {},
    storageDriver?: StorageDriver | undefined
  ): Promise<UploadResult> {
    // Use provided storage driver or fall back to default
    const driver = storageDriver || this.storage;

    // Detect MIME type
    const mimeType = await detectMimeType(ctx.buffer);

    // Validate file size
    if (ctx.buffer.length > this.config.limits.maxFileSize) {
      throw new Error(
        `File size ${ctx.buffer.length} exceeds maximum ${this.config.limits.maxFileSize} bytes`
      );
    }

    // Generate filename
    const fileName = this.fileNamer.generate(ctx.originalName);

    // Generate path
    const pathResult = this.pathGenerator.generate({
      modelType: ctx.modelType,
      modelId: ctx.modelId,
      collection: ctx.collection,
      originalName: ctx.originalName,
      fileName,
    });

    // Store original file
    await driver.put(pathResult.path, ctx.buffer, {
      contentType: mimeType,
      visibility: "public",
    });

    logger.debug(`File uploaded: ${pathResult.path}`);

    // Process conversions if applicable
    const conversionResults: Record<string, { path: string; size: number }> =
      {};

    if (
      Object.keys(conversions).length > 0 &&
      isImageMimeType(mimeType) &&
      this.conversionProcessor
    ) {
      const processed = await this.conversionProcessor.process(
        ctx.buffer,
        conversions
      );

      for (const [conversionName, result] of Object.entries(processed)) {
        const conversionPath = this.pathGenerator.generateConversion(
          {
            modelType: ctx.modelType,
            modelId: ctx.modelId,
            collection: ctx.collection,
            originalName: ctx.originalName,
            fileName,
          },
          conversionName
        );

        await driver.put(conversionPath.path, result.buffer, {
          contentType: getMimeTypeForFormat(result.format),
          visibility: "public",
        });

        conversionResults[conversionName] = {
          path: conversionPath.path,
          size: result.size,
        };

        logger.debug(`Conversion created: ${conversionPath.path}`);
      }
    }

    const result: UploadResult = {
      fileName,
      path: pathResult.path,
      size: ctx.buffer.length,
      mimeType,
      conversions: conversionResults,
    };

    if (pathResult.mediaId) {
      result.mediaId = pathResult.mediaId;
    }

    return result;
  }

  /**
   * Delete a file and its conversion variants from storage.
   * Silently continues if conversion deletion fails.
   *
   * @param path - Storage path of the file to delete.
   * @param conversionPaths - Array of conversion file paths to delete.
   * @param storageDriver - Optional storage driver override (uses default if not provided).
   * @returns Promise that resolves when deletion is complete.
   */
  async delete(
    path: string,
    conversionPaths: string[] = [],
    storageDriver?: StorageDriver | undefined
  ): Promise<void> {
    // Use provided storage driver or fall back to default
    const driver = storageDriver || this.storage;

    // Delete original
    await driver.delete(path);
    logger.debug(`File deleted: ${path}`);

    // Delete conversions
    for (const conversionPath of conversionPaths) {
      try {
        await driver.delete(conversionPath);
        logger.debug(`Conversion deleted: ${conversionPath}`);
      } catch (error) {
        logger.warn(
          `Failed to delete conversion: ${conversionPath}`,
          error instanceof Error ? { message: error.message } : undefined
        );
      }
    }
  }
}
