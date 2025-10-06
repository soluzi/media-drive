import { PrismaClient } from "@prisma/client";
import axios from "axios";
import sharp from "sharp";
import {
  MediaLibraryService,
  MediaRecord,
  AttachFileOptions,
  AttachFromUrlOptions,
  ConversionOptions,
} from "../types";
import { getStorageDriver } from "./storage/index";
import { randomObjectPath } from "./utils/index";
import { detectMimeType, isImageMimeType } from "./utils/index";
import { MediaQueue, ConversionJobData } from "./jobs";

export class MediaLibrary implements MediaLibraryService {
  private prisma: PrismaClient;
  private mediaQueue: MediaQueue | undefined;

  constructor(prisma?: PrismaClient, mediaQueue?: MediaQueue) {
    this.prisma = prisma || new PrismaClient();
    this.mediaQueue = mediaQueue;
  }

  setMediaQueue(mediaQueue: MediaQueue): void {
    this.mediaQueue = mediaQueue;
  }

  async attachFile(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options: AttachFileOptions = {}
  ): Promise<MediaRecord> {
    const {
      collection = "default",
      name = file.originalname,
      disk,
      conversions = {},
      customProperties = {},
    } = options;

    // Detect MIME type
    const mimeType = await detectMimeType(file.buffer);

    // Generate storage path
    const { path: objectPath, fileName } = randomObjectPath(
      modelType,
      modelId,
      collection,
      file.originalname
    );

    // Get storage driver
    const storage = getStorageDriver(
      disk as "local" | "s3" | "bunnycdn" | undefined
    );

    // Store the original file
    await storage.put(objectPath, file.buffer, {
      contentType: mimeType,
      visibility: "public",
    });

    // Process conversions if any
    let responsiveImages: Record<string, any> = {};
    if (Object.keys(conversions).length > 0 && isImageMimeType(mimeType)) {
      responsiveImages = await this.processConversions(
        file.buffer,
        conversions,
        modelType,
        modelId,
        collection,
        fileName,
        storage
      );
    }

    // Create database record
    const mediaRecord = await this.prisma.media.create({
      data: {
        model_type: modelType,
        model_id: modelId,
        collection_name: collection,
        name,
        file_name: fileName,
        mime_type: mimeType,
        disk: disk || "local",
        size: file.size,
        manipulations: conversions,
        custom_properties: customProperties,
        responsive_images: responsiveImages,
      },
    });

    return mediaRecord;
  }

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
      timeout = 30000,
    } = options;

    // Download file from URL
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers,
      timeout,
      maxRedirects: 5,
    });

    const buffer = Buffer.from(response.data);
    const mimeType =
      response.headers["content-type"] || (await detectMimeType(buffer));
    const originalName = name || this.extractFileNameFromUrl(url) || "download";

    // Create a mock Multer file object
    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: originalName,
      encoding: "7bit",
      mimetype: mimeType,
      buffer,
      size: buffer.length,
      destination: "",
      filename: "",
      path: "",
      stream: null as any,
    };

    return this.attachFile(modelType, modelId, file, {
      collection,
      name: name || undefined,
      disk: disk as "local" | "s3" | "bunnycdn" | undefined,
      conversions,
      customProperties,
    });
  }

  async list(
    modelType: string,
    modelId: string,
    collection?: string
  ): Promise<MediaRecord[]> {
    const where: any = {
      model_type: modelType,
      model_id: modelId,
    };

    if (collection) {
      where.collection_name = collection;
    }

    return await this.prisma.media.findMany({
      where,
      orderBy: { order_column: "asc" },
    });
  }

  async remove(mediaId: string): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error(`Media with ID ${mediaId} not found`);
    }

    const storage = getStorageDriver(media.disk as any);

    try {
      // Delete original file
      await storage.delete(
        `${media.model_type}/${media.model_id}/${media.collection_name}/${media.file_name}`
      );

      // Delete conversions if they exist
      if (media.responsive_images) {
        const conversions = media.responsive_images as Record<string, any>;
        for (const [conversionName] of Object.entries(conversions)) {
          const conversionPath = `${media.model_type}/${media.model_id}/${
            media.collection_name
          }/conversions/${media.file_name.replace(
            /\.[^/.]+$/,
            ""
          )}-${conversionName}${this.getFileExtension(media.file_name)}`;
          await storage.delete(conversionPath);
        }
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Failed to delete files for media ${mediaId}:`, error);
    }

    // Delete database record
    await this.prisma.media.delete({
      where: { id: mediaId },
    });
  }

  async resolveFileUrl(
    mediaId: string,
    conversion?: string,
    signed: boolean = false,
    _redirect: boolean = false
  ): Promise<string> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error(`Media with ID ${mediaId} not found`);
    }

    const storage = getStorageDriver(media.disk as any);
    let filePath: string;

    if (conversion && media.responsive_images) {
      const conversions = media.responsive_images as Record<string, any>;
      if (!conversions[conversion]) {
        throw new Error(
          `Conversion '${conversion}' not found for media ${mediaId}`
        );
      }

      filePath = `${media.model_type}/${media.model_id}/${
        media.collection_name
      }/conversions/${media.file_name.replace(
        /\.[^/.]+$/,
        ""
      )}-${conversion}${this.getFileExtension(media.file_name)}`;
    } else {
      filePath = `${media.model_type}/${media.model_id}/${media.collection_name}/${media.file_name}`;
    }

    if (signed) {
      return await storage.temporaryUrl(filePath, 3600); // 1 hour expiry
    }

    return storage.url(filePath);
  }

  private async processConversions(
    buffer: Buffer,
    conversions: Record<string, ConversionOptions>,
    modelType: string,
    modelId: string,
    collection: string,
    fileName: string,
    storage: any
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [conversionName, options] of Object.entries(conversions)) {
      try {
        const convertedBuffer = await this.convertImage(buffer, options);
        const conversionPath = `${modelType}/${modelId}/${collection}/conversions/${fileName.replace(
          /\.[^/.]+$/,
          ""
        )}-${conversionName}${this.getFileExtension(fileName)}`;

        await storage.put(conversionPath, convertedBuffer, {
          contentType: this.getMimeTypeFromFormat(options.format || "jpeg"),
          visibility: "public",
        });

        results[conversionName] = {
          path: conversionPath,
          size: convertedBuffer.length,
        };
      } catch (error) {
        console.warn(`Failed to create conversion '${conversionName}':`, error);
      }
    }

    return results;
  }

  private async convertImage(
    buffer: Buffer,
    options: ConversionOptions
  ): Promise<Buffer> {
    let sharpInstance = sharp(buffer);

    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: options.fit || "cover",
        background: options.background || { r: 255, g: 255, b: 255, alpha: 0 },
      });
    }

    switch (options.format) {
      case "jpeg":
        return await sharpInstance
          .jpeg({ quality: options.quality || 90 })
          .toBuffer();
      case "png":
        return await sharpInstance
          .png({ quality: options.quality || 90 })
          .toBuffer();
      case "webp":
        return await sharpInstance
          .webp({ quality: options.quality || 90 })
          .toBuffer();
      case "avif":
        return await sharpInstance
          .avif({ quality: options.quality || 90 })
          .toBuffer();
      default:
        return await sharpInstance
          .jpeg({ quality: options.quality || 90 })
          .toBuffer();
    }
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

  private getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf("."));
  }

  private getMimeTypeFromFormat(format: string): string {
    const formatToMime: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
    };
    return formatToMime[format] || "image/jpeg";
  }

  async processConversionsAsync(
    mediaId: string,
    conversions: Record<string, ConversionOptions>
  ): Promise<string> {
    if (!this.mediaQueue) {
      throw new Error("Media queue not configured. Set up BullMQ queue first.");
    }

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error(`Media with ID ${mediaId} not found`);
    }

    const jobData: ConversionJobData = {
      mediaId,
      conversions,
      originalPath: `${media.model_type}/${media.model_id}/${media.collection_name}/${media.file_name}`,
      modelType: media.model_type,
      modelId: media.model_id,
      collectionName: media.collection_name,
      fileName: media.file_name,
    };

    const job = await this.mediaQueue.addConversionJob(jobData);
    return job.id!;
  }

  async getConversionJobStatus(jobId: string): Promise<any> {
    if (!this.mediaQueue) {
      throw new Error("Media queue not configured.");
    }

    return await this.mediaQueue.getJobProgress(jobId);
  }

  async getQueueStats(): Promise<any> {
    if (!this.mediaQueue) {
      throw new Error("Media queue not configured.");
    }

    return await this.mediaQueue.getQueueStats();
  }
}
