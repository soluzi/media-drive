import { Worker, Job } from "bullmq";
// import { MediaLibrary } from "../service";
import { PrismaClient } from "@prisma/client";
import { ConversionJobData, ConversionJobResult } from "./types";
import { getStorageDriver } from "../storage";
import { conversionPath } from "../utils";
import sharp from "sharp";

export class MediaConversionWorker {
  private worker: Worker;
  // private _mediaLibrary: MediaLibrary;

  constructor(
    private prisma: PrismaClient,
    private redisConnection: any,
    private queueName: string = "media-conversions"
  ) {
    // this._mediaLibrary = new MediaLibrary(prisma);
    this.worker = new Worker(this.queueName, this.processJob.bind(this), {
      connection: this.redisConnection,
      concurrency: 5,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on("completed", (job: Job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job: Job | undefined, err: Error) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    this.worker.on("progress", (job: Job, progress: number | object) => {
      const progressPercent = typeof progress === "number" ? progress : 0;
      console.log(`Job ${job.id} progress: ${progressPercent}%`);
    });
  }

  private async processJob(
    job: Job<ConversionJobData>
  ): Promise<ConversionJobResult> {
    const {
      mediaId,
      conversions,
      originalPath,
      modelType,
      modelId,
      collectionName,
      fileName,
    } = job.data;

    try {
      await job.updateProgress(10);

      // Get the original file from storage
      const storageDriver = getStorageDriver();
      const originalBuffer = await storageDriver.get(originalPath);

      await job.updateProgress(30);

      // Process conversions
      const responsiveImages: Record<string, { path: string; size: number }> =
        {};
      let progressIncrement = 60 / Object.keys(conversions).length;

      for (const [conversionName, options] of Object.entries(conversions)) {
        try {
          const convertedBuffer = await this.processImageConversion(
            originalBuffer,
            options
          );

          // Generate conversion path
          const conversionFilePath = conversionPath(
            modelType,
            modelId,
            collectionName,
            fileName,
            conversionName
          );

          // Store converted image
          await storageDriver.put(conversionFilePath, convertedBuffer, {
            contentType: this.getContentType(options.format),
            visibility: "public",
          });

          // Get file size (using converted buffer length)
          // const stats = await storageDriver.get(conversionFilePath);
          responsiveImages[conversionName] = {
            path: conversionFilePath,
            size: convertedBuffer.length,
          };

          await job.updateProgress(
            30 + progressIncrement * Object.keys(responsiveImages).length
          );
        } catch (error) {
          console.error(
            `Failed to process conversion ${conversionName}:`,
            error
          );
          // Continue with other conversions
        }
      }

      await job.updateProgress(90);

      // Update media record with responsive images
      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          responsive_images: responsiveImages,
        },
      });

      await job.updateProgress(100);

      return {
        success: true,
        responsiveImages,
      };
    } catch (error) {
      console.error("Conversion job failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processImageConversion(
    originalBuffer: Buffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    }
  ): Promise<Buffer> {
    let sharpInstance = sharp(originalBuffer);

    // Apply resize if dimensions are specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Apply format conversion
    const format = options.format || "jpeg";
    switch (format) {
      case "jpeg":
      case "jpg":
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ quality: options.quality || 80 });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality: options.quality || 80 });
        break;
      case "avif":
        sharpInstance = sharpInstance.avif({ quality: options.quality || 50 });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 });
    }

    return await sharpInstance.toBuffer();
  }

  private getContentType(format?: string): string {
    switch (format) {
      case "jpeg":
      case "jpg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "avif":
        return "image/avif";
      default:
        return "image/jpeg";
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  getWorker(): Worker {
    return this.worker;
  }
}

export function createMediaConversionWorker(
  prisma: PrismaClient,
  redisConnection: any,
  queueName?: string
): MediaConversionWorker {
  return new MediaConversionWorker(prisma, redisConnection, queueName);
}
