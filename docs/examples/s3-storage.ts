/**
 * S3 Storage Example
 *
 * This example shows how to configure Media Drive v2 with AWS S3 storage
 */

import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";

// 1. Setup Prisma
const prisma = new PrismaClient();

// 2. Create Media Library with S3
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "s3",
    disks: {
      s3: {
        driver: "s3",
        key: process.env.S3_KEY!,
        secret: process.env.S3_SECRET!,
        region: process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET!,
        root: "media", // Optional: prefix for all files
        url: process.env.S3_URL, // Optional: custom S3 URL
        endpoint: process.env.S3_ENDPOINT, // Optional: for S3-compatible services
        use_path_style_endpoint: process.env.S3_USE_PATH_STYLE === "true",
      },
    },
    limits: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
    },
    security: {
      allowedMime: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "application/pdf",
      ],
    },
    urls: {
      signedDefault: true, // Use signed URLs by default
      temporaryUrlExpiry: 3600, // 1 hour
    },
  },
  prisma,
});

// 3. Usage Example
async function uploadToS3() {
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

    const media = await mediaLibrary.attachFile("Product", "123", file, {
      collection: "images",
      conversions: {
        thumbnail: { width: 200, height: 200, fit: "cover" },
        medium: { width: 500, height: 500 },
        large: { width: 1200, height: 1200 },
      },
    });

    console.log("Uploaded to S3:", media);

    // Get signed URL
    const url = await mediaLibrary.resolveFileUrl(media.id, undefined, true);
    console.log("Signed URL:", url);

    // Get conversion URL
    const thumbUrl = await mediaLibrary.resolveFileUrl(
      media.id,
      "thumbnail",
      true
    );
    console.log("Thumbnail URL:", thumbUrl);
  } catch (error) {
    console.error("S3 upload error:", error);
  }
}

// 4. Environment Variables Required
/*
S3_KEY=your_access_key_id
S3_SECRET=your_secret_access_key
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_URL=https://your-bucket.s3.amazonaws.com (optional)
S3_ENDPOINT=https://s3.amazonaws.com (optional)
S3_USE_PATH_STYLE=false (optional)
*/

export { mediaLibrary, uploadToS3 };
