# Getting Started with Media Drive v2

Media Drive is a modular, TypeScript-first media library for Node.js applications, inspired by Laravel Media Library. It provides a clean, extensible architecture for managing file uploads, conversions, and storage.

## Installation

```bash
npm install media-drive
# or
pnpm add media-drive
# or
yarn add media-drive
```

### Peer Dependencies

Media Drive requires Prisma for database operations:

```bash
npm install @prisma/client prisma
```

## Quick Start

### 1. Initialize Configuration

Run the CLI to generate a config file:

```bash
npx media-drive init
```

This creates a `media.config.ts` file in your project root.

### 2. Set Up Database

Add the Media model to your Prisma schema:

```bash
npx media-drive migrate
```

Then run Prisma migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Basic Usage

```typescript
import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create media library instance
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
  },
  prisma,
});

// Attach a file
const media = await mediaLibrary.attachFile(
  "User", // Model type
  "123", // Model ID
  req.file, // Multer file
  {
    collection: "avatar",
    conversions: {
      thumb: { width: 150, height: 150, fit: "cover" },
      medium: { width: 300, height: 300 },
    },
  }
);

// Get file URL
const url = await mediaLibrary.resolveFileUrl(media.id);

// List all media for a model
const allMedia = await mediaLibrary.list("User", "123");

// Delete media
await mediaLibrary.remove(media.id);
```

## Express Integration

```typescript
import express from "express";
import multer from "multer";
import { createMediaLibrary, createMediaRouter } from "media-drive";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const mediaLibrary = createMediaLibrary({ prisma });

// Mount media routes
app.use("/api", createMediaRouter(mediaLibrary));

// Custom upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const media = await mediaLibrary.attachFile(
    "Post",
    req.body.postId,
    req.file
  );
  res.json({ media });
});
```

## Key Features

✨ **Modular Architecture** - Plug in your own storage drivers, processors, or queues  
🔧 **Type-Safe Configuration** - Zod-validated config with TypeScript inference  
📦 **Multiple Storage Drivers** - Local, S3, BunnyCDN built-in  
🎨 **Image Processing** - Sharp-powered conversions with async job support  
⚡ **Async Job Processing** - BullMQ integration for background tasks  
🔒 **Security** - MIME type validation, file size limits, signed URLs  
🛠️ **CLI Tools** - Generate configs, run diagnostics, manage migrations

## Next Steps

- [Configuration Guide](./configuration.md) - Detailed config options
- [API Reference](./api-reference.md) - Complete API documentation
- [Storage Drivers](./storage.md) - Storage backend configuration
- [Advanced Usage](./advanced.md) - Custom drivers, strategies, and hooks
- [Examples](./examples/) - Real-world usage examples
