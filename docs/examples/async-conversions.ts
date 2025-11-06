/**
 * Async Conversions Example
 *
 * This example shows how to use BullMQ for asynchronous image processing.
 * Uses standardized HTTP responders for consistent API responses.
 */

import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";
import express from "express";
import multer from "multer";
import {
  noFile,
  createdWithMessage,
  ok,
  notFound,
  internalError,
  uploadError,
} from "media-drive/core";

// 1. Setup Prisma
const prisma = new PrismaClient();

// 2. Create Media Library with Queue
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "local",
    disks: {
      local: {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },
    queue: {
      driver: "bullmq",
      name: "media-conversions",
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "0"),
      },
    },
  },
  prisma,
});

// 3. Express Setup
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 4. Upload with Async Conversions
app.post("/upload-async", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return noFile(res);
    }

    // Upload file without conversions first
    const media = await mediaLibrary.attachFile(
      "User",
      req.body.userId,
      req.file,
      {
        collection: "photos",
        // No conversions here - we'll do them async
      }
    );

    // Queue conversions for background processing
    const jobId = await mediaLibrary.processConversionsAsync(media.id, {
      thumbnail: { width: 150, height: 150, fit: "cover" },
      medium: { width: 500, height: 500 },
      large: { width: 1200, height: 1200 },
      webp: { width: 800, height: 600, format: "webp" },
    });

    return createdWithMessage(
      res,
      {
        media: {
          id: media.id,
          name: media.name,
          size: media.size,
          mimeType: media.mime_type,
        },
        jobId,
      },
      "File uploaded, conversions queued for processing"
    );
  } catch (error) {
    console.error("Upload error:", error);
    return uploadError(res, "Upload failed");
  }
});

// 5. Check Job Status
app.get("/job/:jobId/status", async (req, res) => {
  try {
    const status = await mediaLibrary.getConversionJobStatus(req.params.jobId);
    return ok(res, { status });
  } catch (error) {
    return notFound(res, "Job not found");
  }
});

// 6. Get Queue Statistics
app.get("/queue/stats", async (req, res) => {
  try {
    const stats = await mediaLibrary.getQueueStats();
    return ok(res, { stats });
  } catch (error) {
    return internalError(res, "Failed to get queue stats");
  }
});

// 7. Worker Process (run in separate terminal)
/*
// worker.ts
import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "local",
    disks: {
      local: {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },
    queue: {
      driver: "bullmq",
      name: "media-conversions",
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "0"),
      },
    },
  },
  prisma,
});

// The worker will automatically process queued jobs
console.log("Media conversion worker started");
*/

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Make sure to start the worker process in a separate terminal");
});

// 8. Environment Variables Required
/*
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password (optional)
REDIS_DB=0 (optional)
*/

export { mediaLibrary };
