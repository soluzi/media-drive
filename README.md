# media-storage

A Node.js media library package inspired by Laravel Media Library, designed for Express + Prisma + TypeScript environments.

## Features

- 📁 **File Management**: Attach files to any model (polymorphic relationships)
- 🗄️ **Multiple Storage**: Support for local filesystem, Amazon S3, and BunnyCDN
- 🖼️ **Image Processing**: Automatic image conversions using Sharp
- 🔗 **URL Uploads**: Attach files from external URLs
- 📊 **Prisma Integration**: Full TypeScript support with Prisma ORM
- 🛡️ **Type Safety**: Complete TypeScript definitions
- ⚡ **Express Ready**: Built-in REST API routes
- 🔄 **Async Processing**: Optional BullMQ integration for background jobs

## Installation

```bash
npm install media-storage
```

## Prerequisites

Make sure you have the following peer dependencies installed:

```bash
npm install @prisma/client prisma
```

## Setup

### 1. Database Schema

Add the media model to your Prisma schema:

```prisma
model Media {
  id                String   @id @default(cuid())
  model_type        String
  model_id          String
  collection_name   String   @default("default")
  name              String
  file_name         String
  mime_type         String
  disk              String   @default("local")
  size              Int
  manipulations     Json?
  custom_properties Json?
  responsive_images Json?
  order_column      Int?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@map("media")
  @@index([model_type, model_id])
  @@index([model_type, model_id, collection_name])
  @@index([disk])
}
```

Run the migration:

```bash
npx prisma migrate dev
```

### 2. Configuration

Initialize the media library in your application:

```typescript
import { initMediaLibrary } from "media-storage";

// Local storage configuration
initMediaLibrary({
  default_disk: "local",
  local: {
    root: "uploads",
    public_base_url: "http://localhost:3000/uploads",
  },
});

// Or with S3 configuration
initMediaLibrary({
  default_disk: "s3",
  local: {
    root: "uploads",
    public_base_url: "http://localhost:3000/uploads",
  },
  s3: {
    key: "your-access-key",
    secret: "your-secret-key",
    region: "us-east-1",
    bucket: "your-bucket-name",
  },
});

// Or with BunnyCDN configuration
initMediaLibrary({
  default_disk: "bunnycdn",
  local: {
    root: "uploads",
    public_base_url: "http://localhost:3000/uploads",
  },
  bunnycdn: {
    storage_zone: "your-storage-zone",
    api_key: "your-api-key",
    pull_zone: "your-pull-zone",
    root: "media", // optional root path
    region: "de", // optional region (default: "de")
  },
});
```

### 3. Express Integration

```typescript
import express from "express";
import { mediaRouter } from "media-storage";

const app = express();

// Add the media routes
app.use("/media", mediaRouter);

app.listen(3000);
```

## API Endpoints

### Upload File

```
POST /media/:modelType/:modelId/:collection
Content-Type: multipart/form-data

Form fields:
- file: The file to upload
- name: Optional custom name
- disk: Optional storage disk ('local', 's3', or 'bunnycdn')
- conversions: Optional JSON string with image conversion options
- customProperties: Optional JSON string with custom properties
```

### Attach from URL

```
POST /media/from-url
Content-Type: application/json

{
  "modelType": "user",
  "modelId": "123",
  "url": "https://example.com/image.jpg",
  "collection": "avatar",
  "name": "profile-picture",
  "conversions": {
    "thumb": { "width": 150, "height": 150 },
    "medium": { "width": 500, "height": 500 }
  }
}
```

### List Media

```
GET /media/:modelType/:modelId?collection=avatar
```

### Get File URL

```
GET /media/file/:id?conversion=thumb&signed=1&redirect=0
```

### Delete Media

```
DELETE /media/:id
```

## Usage Examples

### Basic File Upload

```typescript
import { MediaLibrary } from "media-storage";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mediaLibrary = new MediaLibrary(prisma);

// Upload a file
const mediaRecord = await mediaLibrary.attachFile(
  "user",
  "123",
  multerFile, // Express.Multer.File
  {
    collection: "avatar",
    name: "profile-picture",
    conversions: {
      thumb: { width: 150, height: 150 },
      medium: { width: 500, height: 500 },
    },
  }
);
```

### Attach from URL

```typescript
const mediaRecord = await mediaLibrary.attachFromUrl(
  "user",
  "123",
  "https://example.com/avatar.jpg",
  {
    collection: "avatar",
    conversions: {
      thumb: { width: 150, height: 150 },
    },
  }
);
```

### List Media

```typescript
const mediaFiles = await mediaLibrary.list("user", "123", "avatar");
```

### Get File URL

```typescript
const fileUrl = await mediaLibrary.resolveFileUrl(
  mediaId,
  "thumb", // conversion name
  true, // signed URL
  false // don't redirect
);
```

### Delete Media

```typescript
await mediaLibrary.remove(mediaId);
```

## Image Conversions

The library supports automatic image conversions using Sharp:

```typescript
const conversions = {
  thumb: {
    width: 150,
    height: 150,
    fit: "cover",
  },
  medium: {
    width: 500,
    height: 500,
    fit: "contain",
  },
  webp: {
    format: "webp",
    quality: 90,
  },
};
```

### Conversion Options

- `width`: Target width in pixels
- `height`: Target height in pixels
- `fit`: How to fit the image ('cover', 'contain', 'fill', 'inside', 'outside')
- `quality`: JPEG/WebP quality (1-100)
- `format`: Output format ('jpeg', 'png', 'webp', 'avif')
- `background`: Background color for transparent images

## Storage Drivers

### Local Storage

Files are stored in the local filesystem with the following structure:

```
uploads/
  user/
    123/
      avatar/
        abc123.jpg
        conversions/
          abc123-thumb.jpg
          abc123-medium.jpg
```

### S3 Storage

Files are stored in S3 with the same structure, optionally with a root prefix.

### BunnyCDN Storage

Files are stored in BunnyCDN Storage with the same structure, optionally with a root prefix. Files are accessible via your configured pull zone URL.

## TypeScript Support

The package provides complete TypeScript definitions:

```typescript
import {
  MediaRecord,
  AttachFileOptions,
  ConversionOptions,
  MediaLibraryConfig,
} from "media-storage";
```

## Error Handling

The library throws descriptive errors for common issues:

- Configuration not initialized
- Invalid file types
- Storage driver errors
- Database connection issues

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.
