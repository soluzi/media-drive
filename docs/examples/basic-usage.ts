/**
 * Basic Usage Example
 *
 * This example shows the most common usage patterns for Media Drive v3.
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
  okWithMessage,
} from "media-drive/core";

// 1. Setup Prisma
const prisma = new PrismaClient();

// 2. Create Media Library
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
    limits: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
  },
  prisma,
});

// 3. Express Setup
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 4. Upload Endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return noFile(res);
    }

    const media = await mediaLibrary.attachFile(
      "User", // Model type
      req.body.userId, // Model ID
      req.file, // Multer file
      {
        collection: "avatar",
        conversions: {
          thumb: { width: 150, height: 150, fit: "cover" },
          medium: { width: 300, height: 300 },
        },
      }
    );

    return createdWithMessage(
      res,
      {
        media: {
          id: media.id,
          name: media.name,
          size: media.size,
          mimeType: media.mime_type,
        },
      },
      "File uploaded successfully"
    );
  } catch (error) {
    console.error("Upload error:", error);
    return internalError(res, "Upload failed");
  }
});

// 5. Get File URL
app.get("/media/:id", async (req, res) => {
  try {
    const url = await mediaLibrary.resolveFileUrl(req.params.id);
    return ok(res, { url });
  } catch (error) {
    return notFound(res, "Media not found");
  }
});

// 6. List User Media
app.get("/users/:userId/media", async (req, res) => {
  try {
    const media = await mediaLibrary.list("User", req.params.userId);
    return ok(res, { media });
  } catch (error) {
    return internalError(res, "Failed to fetch media");
  }
});

// 7. Delete Media
app.delete("/media/:id", async (req, res) => {
  try {
    await mediaLibrary.remove(req.params.id);
    return okWithMessage(res, { success: true }, "Media deleted successfully");
  } catch (error) {
    return internalError(res, "Failed to delete media");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
