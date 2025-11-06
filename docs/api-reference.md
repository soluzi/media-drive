# API Reference

Complete API documentation for Media Drive v3.

## Factory Function

### `createMediaLibrary(options?)`

Creates a configured MediaLibrary instance.

```typescript
function createMediaLibrary(options?: CreateMediaLibraryOptions): MediaLibrary;
```

**Options:**

```typescript
interface CreateMediaLibraryOptions {
  config?: Partial<MediaConfig>;
  prisma?: PrismaClient;
  providers?: {
    storageDriver?: StorageDriver;
    conversionProcessor?: ConversionProcessor;
    queueDriver?: QueueDriver;
    pathGenerator?: PathGenerator;
    fileNamer?: FileNamer;
  };
}
```

**Example:**

```typescript
const mediaLibrary = createMediaLibrary({
  config: { disk: "local" },
  prisma: new PrismaClient(),
});
```

---

## MediaLibrary Class

### `attachFile(modelType, modelId, file, options?)`

Attach a file to a model.

```typescript
async attachFile(
  modelType: string,
  modelId: string,
  file: Express.Multer.File,
  options?: AttachFileOptions
): Promise<MediaRecord>
```

**Options:**

```typescript
interface AttachFileOptions {
  collection?: string; // Default: "default"
  name?: string; // Default: file.originalname
  disk?: string; // Default: config.disk
  conversions?: Record<string, ConversionOptions>;
  customProperties?: Record<string, any>;
}
```

**Example:**

```typescript
const media = await mediaLibrary.attachFile("User", "123", file, {
  collection: "avatar",
  conversions: {
    thumb: { width: 150, height: 150, fit: "cover" },
  },
});
```

---

### `attachFromUrl(modelType, modelId, url, options?)`

Download and attach a file from a URL.

```typescript
async attachFromUrl(
  modelType: string,
  modelId: string,
  url: string,
  options?: AttachFromUrlOptions
): Promise<MediaRecord>
```

**Options:** Same as `AttachFileOptions` plus:

```typescript
interface AttachFromUrlOptions extends AttachFileOptions {
  headers?: Record<string, string>;
  timeout?: number;
}
```

**Example:**

```typescript
const media = await mediaLibrary.attachFromUrl(
  "Post",
  "456",
  "https://example.com/image.jpg",
  {
    collection: "featured",
    timeout: 10000,
  }
);
```

---

### `list(modelType, modelId, collection?)`

List all media for a model.

```typescript
async list(
  modelType: string,
  modelId: string,
  collection?: string
): Promise<MediaRecord[]>
```

**Example:**

```typescript
// All media for user
const allMedia = await mediaLibrary.list("User", "123");

// Only avatar collection
const avatars = await mediaLibrary.list("User", "123", "avatar");
```

---

### `remove(mediaId)`

Delete a media record and its files.

```typescript
async remove(mediaId: string): Promise<void>
```

**Example:**

```typescript
await mediaLibrary.remove("abc-123-def-456");
```

---

### `resolveFileUrl(mediaId, conversion?, signed?)`

Get the URL for a media file.

```typescript
async resolveFileUrl(
  mediaId: string,
  conversion?: string,
  signed?: boolean
): Promise<string>
```

**Example:**

```typescript
// Original file
const url = await mediaLibrary.resolveFileUrl("abc-123");

// Conversion
const thumbUrl = await mediaLibrary.resolveFileUrl("abc-123", "thumb");

// Signed URL
const signedUrl = await mediaLibrary.resolveFileUrl("abc-123", undefined, true);
```

---

### `processConversionsAsync(mediaId, conversions)`

Queue conversions for async processing.

```typescript
async processConversionsAsync(
  mediaId: string,
  conversions: Record<string, ConversionOptions>
): Promise<string>  // Returns job ID
```

**Example:**

```typescript
const jobId = await mediaLibrary.processConversionsAsync("abc-123", {
  large: { width: 1920, height: 1080 },
  medium: { width: 800, height: 600 },
});

// Check status
const status = await mediaLibrary.getConversionJobStatus(jobId);
```

---

### `getConversionJobStatus(jobId)`

Get the status of a conversion job.

```typescript
async getConversionJobStatus(jobId: string): Promise<JobInfo>
```

**Returns:**

```typescript
interface JobInfo {
  id: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress?: number;
  result?: any;
  error?: string;
}
```

---

### `getQueueStats()`

Get queue statistics.

```typescript
async getQueueStats(): Promise<QueueStats>
```

**Returns:**

```typescript
interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
```

---

## Conversion Options

```typescript
interface ConversionOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  quality?: number; // 1-100
  background?: string; // Hex color, e.g., "#FFFFFF"
  format?: "jpeg" | "png" | "webp" | "avif";
}
```

---

## Media Record

```typescript
interface MediaRecord {
  id: string;
  model_type: string;
  model_id: string;
  collection_name: string;
  name: string;
  file_name: string;
  mime_type: string;
  disk: string;
  size: number;
  manipulations: any;
  custom_properties: any;
  responsive_images: any;
  order_column: number | null;
  created_at: Date;
  updated_at: Date;
}
```

---

## Express Router

### `createApiRouter(mediaLibrary, config?)`

Create an Express router with media endpoints.

```typescript
function createApiRouter(
  mediaLibrary: EnhancedMediaLibrary,
  config?: ApiRouterConfig
): ApiRouter;
```

**Options:**

```typescript
interface ApiRouterConfig {
  basePath: string; // Default: "/api/media"
  endpoints: {
    upload: string;
    download: string;
    delete: string;
    list: string;
    info: string;
  };
  cors?: boolean;
  authentication?: boolean;
  rateLimiting?: {
    uploads: string;
    downloads: string;
  };
}
```

**Example:**

```typescript
import { createEnhancedMediaLibrary, createApiRouter } from "media-drive";

const mediaLibrary = createEnhancedMediaLibrary({ config, prisma });

const apiRouter = createApiRouter(mediaLibrary, {
  basePath: "/api/media",
  endpoints: {
    upload: "/upload",
    download: "/:id/download",
    delete: "/:id",
    list: "/",
    info: "/:id",
  },
  cors: true,
});

app.use("/api/media", apiRouter.getRouter());
```

**Endpoints:**

- `POST /api/media/upload` - Upload file
- `GET /api/media/:id/download` - Download file
- `GET /api/media/:id` - Get file info
- `GET /api/media` - List media (with query params: modelType, modelId, collection)
- `DELETE /api/media/:id` - Delete media

---

## HTTP Response Helpers

Media Drive provides standardized HTTP response helpers for consistent API responses:

```typescript
import {
  ok,
  created,
  createdWithMessage,
  okWithMessage,
  noContent,
  badRequest,
  notFound,
  internalError,
  noFile,
  fileTooLarge,
  validationError,
  uploadError,
} from "media-drive/core";
```

**Example:**

```typescript
import { ok, created, noFile, internalError } from "media-drive/core";

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return noFile(res);
    }

    const media = await mediaLibrary.attachFile("User", "123", req.file);
    return created(res, { media });
  } catch (error) {
    return internalError(res, "Upload failed");
  }
});
```

**Response Format:**

All helpers return responses in this format:

```typescript
// Success
{
  success: true,
  data: T,
  message?: string,
  pagination?: PageMeta
}

// Error
{
  success: false,
  message: string,
  code?: string
}
```

---

## CLI Commands

### `media-drive init`

Generate `media.config.ts` file.

### `media-drive migrate`

Print Prisma schema and migration instructions.

### `media-drive doctor`

Check environment and dependencies.

---

## Contracts (Interfaces)

All core interfaces are exported from `media-drive/core`:

```typescript
import {
  StorageDriver,
  ConversionProcessor,
  QueueDriver,
  PathGenerator,
  FileNamer,
  UrlSigner,
} from "media-drive/core";
```

See [Advanced Usage](./advanced.md) for implementing custom drivers.
