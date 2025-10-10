/**
 * Custom Drivers Example
 *
 * This example shows how to create and use custom storage drivers,
 * conversion processors, and queue drivers
 */

import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";
import {
  StorageDriver,
  ConversionProcessor,
  QueueDriver,
  PutOptions,
  StoredObject,
  ConversionOptions,
  JobStatus,
} from "media-drive/core";

// 1. Custom Storage Driver
class CloudinaryStorageDriver implements StorageDriver {
  constructor(
    private config: { cloudName: string; apiKey: string; apiSecret: string }
  ) {}

  async put(
    path: string,
    contents: Buffer,
    opts?: PutOptions
  ): Promise<StoredObject> {
    // Implement Cloudinary upload logic
    console.log(`Uploading to Cloudinary: ${path}`);

    // Simulate upload
    return {
      path,
      size: contents.length,
      etag: `cloudinary-${Date.now()}`,
    };
  }

  async get(path: string): Promise<Buffer> {
    // Implement Cloudinary download logic
    console.log(`Downloading from Cloudinary: ${path}`);
    return Buffer.from("fake-cloudinary-data");
  }

  async delete(path: string): Promise<void> {
    // Implement Cloudinary delete logic
    console.log(`Deleting from Cloudinary: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    // Implement Cloudinary exists check
    console.log(`Checking existence in Cloudinary: ${path}`);
    return true;
  }

  url(path: string): string {
    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${path}`;
  }

  async temporaryUrl(path: string, expiresInSec?: number): Promise<string> {
    // Implement signed URL generation
    return this.url(path);
  }
}

// 2. Custom Conversion Processor
class CustomImageProcessor implements ConversionProcessor {
  async process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, Buffer>> {
    const results: Record<string, Buffer> = {};

    for (const [name, options] of Object.entries(conversions)) {
      console.log(`Processing conversion: ${name}`, options);

      // Implement custom image processing logic
      // This could use a different library like Jimp, Canvas, etc.
      results[name] = Buffer.from(`processed-${name}-${Date.now()}`);
    }

    return results;
  }
}

// 3. Custom Queue Driver
class CustomQueueDriver implements QueueDriver {
  private jobs = new Map<string, JobStatus>();

  async enqueue(
    mediaId: string,
    conversions: Record<string, ConversionOptions>
  ): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random()}`;

    this.jobs.set(jobId, {
      id: jobId,
      status: "waiting",
      progress: 0,
    });

    // Simulate async processing
    setTimeout(() => {
      this.processJob(jobId, mediaId, conversions);
    }, 1000);

    return jobId;
  }

  async status(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job;
  }

  async stats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const stats = { waiting: 0, active: 0, completed: 0, failed: 0 };

    for (const job of this.jobs.values()) {
      stats[job.status as keyof typeof stats]++;
    }

    return stats;
  }

  private async processJob(
    jobId: string,
    mediaId: string,
    conversions: Record<string, ConversionOptions>
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = "active";
      job.progress = 50;

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      job.status = "completed";
      job.progress = 100;

      console.log(`Job ${jobId} completed for media ${mediaId}`);
    } catch (error) {
      job.status = "failed";
      console.error(`Job ${jobId} failed:`, error);
    }
  }
}

// 4. Setup Prisma
const prisma = new PrismaClient();

// 5. Create Media Library with Custom Drivers
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "local", // This will be overridden by custom driver
    disks: {
      local: {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },
  },
  prisma,
  providers: {
    storageDriver: new CloudinaryStorageDriver({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      apiSecret: process.env.CLOUDINARY_API_SECRET!,
    }),
    conversionProcessor: new CustomImageProcessor(),
    queueDriver: new CustomQueueDriver(),
  },
});

// 6. Usage Example
async function useCustomDrivers() {
  try {
    // Simulate a file upload
    const file = {
      fieldname: "file",
      originalname: "example.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
      size: 1024,
    };

    // Upload with custom storage driver
    const media = await mediaLibrary.attachFile("Product", "123", file, {
      collection: "images",
      conversions: {
        thumbnail: { width: 200, height: 200, fit: "cover" },
        medium: { width: 500, height: 500 },
      },
    });

    console.log("Uploaded with custom drivers:", media);

    // Queue async conversions with custom queue driver
    const jobId = await mediaLibrary.processConversionsAsync(media.id, {
      large: { width: 1200, height: 1200 },
      webp: { width: 800, height: 600, format: "webp" },
    });

    console.log("Queued job:", jobId);

    // Check job status
    const status = await mediaLibrary.getConversionJobStatus(jobId);
    console.log("Job status:", status);

    // Get queue stats
    const stats = await mediaLibrary.getQueueStats();
    console.log("Queue stats:", stats);
  } catch (error) {
    console.error("Custom drivers error:", error);
  }
}

// 7. Environment Variables Required
/*
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
*/

export { mediaLibrary, useCustomDrivers };
