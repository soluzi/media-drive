/**
 * Simple Path Strategy Example
 * 
 * This example demonstrates the new simple path strategy that uses
 * the format: mediaId/fileName
 */

import { createMediaLibrary } from "../../src/factory";
import { defineConfig } from "../../src/config/schema";

// Configure Media Drive to use simple path strategy
const config = defineConfig({
  pathGeneration: {
    strategy: "simple" as const, // Uses mediaId/fileName format
  },
  queue: {
    driver: "in-memory" as const,
  },
  disk: "local",
  disks: {
    local: {
      driver: "local" as const,
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
  },
});

// Create MediaLibrary instance
const mediaLibrary = createMediaLibrary({
  config,
});

// Example usage
async function demonstrateSimplePaths() {
  console.log("🚀 Simple Path Strategy Demo");
  console.log("Format: mediaId/fileName\n");

  // Create a mock file
  const mockFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "profile.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    buffer: Buffer.from("mock image data"),
    size: 1024,
    destination: "",
    filename: "",
    path: "",
    stream: null as any,
  };

  try {
    // Attach file - this will generate a UUID for mediaId
    const result = await mediaLibrary.attachFile("User", "123", mockFile, {
      collection: "avatars",
    });

    console.log("✅ File uploaded successfully!");
    console.log("Media ID:", result.id);
    console.log("File name:", result.file_name);
    console.log("Path format: mediaId/fileName");
    console.log("Actual path:", `${result.id}/${result.file_name}`);

    // Get file URL
    const fileUrl = await mediaLibrary.resolveFileUrl(result.id);
    console.log("File URL:", fileUrl);

    // Example with conversions
    const mockFile2: Express.Multer.File = {
      fieldname: "file",
      originalname: "banner.png",
      encoding: "7bit",
      mimetype: "image/png",
      buffer: Buffer.from("mock banner data"),
      size: 2048,
      destination: "",
      filename: "",
      path: "",
      stream: null as any,
    };

    const result2 = await mediaLibrary.attachFile("Post", "456", mockFile2, {
      collection: "images",
      conversions: {
        thumbnail: { width: 200, height: 200, fit: "cover" },
        medium: { width: 500, height: 500 },
      },
    });

    console.log("\n✅ File with conversions uploaded!");
    console.log("Media ID:", result2.id);
    console.log("Original path:", `${result2.id}/${result2.file_name}`);
    console.log("Thumbnail path:", `${result2.id}/${result2.file_name.replace('.png', '-thumbnail.png')}`);

    // Get conversion URL
    const thumbnailUrl = await mediaLibrary.resolveFileUrl(result2.id, "thumbnail");
    console.log("Thumbnail URL:", thumbnailUrl);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Benefits of simple path strategy
console.log("📁 Simple Path Strategy Benefits:");
console.log("• Clean, flat structure: mediaId/fileName");
console.log("• No nested directories");
console.log("• Easy to understand and debug");
console.log("• UUID-based mediaId ensures uniqueness");
console.log("• Works well with CDNs and caching");
console.log("• Simple URL structure for frontend consumption");

// Comparison with other strategies
console.log("\n🔄 Path Strategy Comparison:");
console.log("• default: modelType/modelId/collection/fileName");
console.log("• simple: mediaId/fileName");
console.log("• date-based: modelType/YYYY/MM/DD/fileName");
console.log("• flat: fileName (all files in root)");

export { mediaLibrary, demonstrateSimplePaths };
