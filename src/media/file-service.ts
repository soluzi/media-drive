/**
 * File Service
 *
 * Internal service for file operations
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

export interface FileUploadContext {
  modelType: string;
  modelId: string;
  collection: string;
  originalName: string;
  buffer: Buffer;
}

export interface UploadResult {
  fileName: string;
  path: string;
  size: number;
  mimeType: string;
  conversions: Record<string, { path: string; size: number }>;
  mediaId?: string;
}

export class FileService {
  constructor(
    private config: MediaConfig,
    private storage: StorageDriver,
    private pathGenerator: PathGenerator,
    private fileNamer: FileNamer,
    private conversionProcessor?: ConversionProcessor | undefined
  ) {}

  /**
   * Upload a file with optional conversions
   */
  async upload(
    ctx: FileUploadContext,
    conversions: Record<string, ConversionOptions> = {}
  ): Promise<UploadResult> {
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
    await this.storage.put(pathResult.path, ctx.buffer, {
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

        await this.storage.put(conversionPath.path, result.buffer, {
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
   * Delete a file and its conversions
   */
  async delete(path: string, conversionPaths: string[] = []): Promise<void> {
    // Delete original
    await this.storage.delete(path);
    logger.debug(`File deleted: ${path}`);

    // Delete conversions
    for (const conversionPath of conversionPaths) {
      try {
        await this.storage.delete(conversionPath);
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
