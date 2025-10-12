/**
 * Basic Usage Example
 *
 * This example shows the most common usage patterns for Media Drive v3
 */

import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";
import express from "express";
import multer from "multer";

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
      return res.status(400).json({ error: "No file uploaded" });
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

    res.json({
      success: true,
      media: {
        id: media.id,
        name: media.name,
        size: media.size,
        mimeType: media.mime_type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 5. Get File URL
app.get("/media/:id", async (req, res) => {
  try {
    const url = await mediaLibrary.resolveFileUrl(req.params.id);
    res.json({ url });
  } catch (error) {
    res.status(404).json({ error: "Media not found" });
  }
});

// 6. List User Media
app.get("/users/:userId/media", async (req, res) => {
  try {
    const media = await mediaLibrary.list("User", req.params.userId);
    res.json({ media });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

// 7. Delete Media
app.delete("/media/:id", async (req, res) => {
  try {
    await mediaLibrary.remove(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete media" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
