# Advanced Usage

## Custom Conversion Processor

Implement your own image processing:

```typescript
import {
  ConversionProcessor,
  ConversionOptions,
  ConversionResult,
} from "media-drive/core";

export class MyProcessor implements ConversionProcessor {
  async process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, ConversionResult>> {
    const results: Record<string, ConversionResult> = {};

    for (const [name, options] of Object.entries(conversions)) {
      results[name] = await this.processOne(input, options);
    }

    return results;
  }

  async processOne(
    input: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    // Your processing logic (ImageMagick, etc.)
    return {
      buffer: processedBuffer,
      size: processedBuffer.length,
      format: options.format || "jpeg",
    };
  }
}

// Use it
const mediaLibrary = createMediaLibrary({
  providers: {
    conversionProcessor: new MyProcessor(),
  },
});
```

---

## Custom Queue Driver

Implement custom async job processing:

```typescript
import { QueueDriver, JobInfo, QueueStats } from "media-drive/core";

export class MyQueueDriver implements QueueDriver {
  async enqueue(data: ConversionJobData): Promise<string> {
    // Enqueue job, return job ID
  }

  async status(jobId: string): Promise<JobInfo> {
    // Get job status
  }

  async stats(): Promise<QueueStats> {
    // Get queue statistics
  }

  async close(): Promise<void> {
    // Cleanup
  }
}
```

---

## Custom Path Generator

Control how file paths are structured:

```typescript
import { PathGenerator, PathContext, PathResult } from "media-drive/core";

export class CustomPathGenerator implements PathGenerator {
  generate(ctx: PathContext): PathResult {
    // e.g., organize by user ID hash
    const hash = ctx.modelId.slice(0, 2);
    const directory = `${ctx.modelType}/${hash}/${ctx.modelId}`;
    const path = `${directory}/${ctx.fileName}`;

    return { path, directory, fileName: ctx.fileName };
  }

  generateConversion(ctx: PathContext, conversionName: string): PathResult {
    // Custom conversion path
  }
}

// Use it
const mediaLibrary = createMediaLibrary({
  providers: {
    pathGenerator: new CustomPathGenerator(),
  },
});
```

---

## Custom File Namer

Implement custom file naming:

```typescript
import { FileNamer } from "media-drive/core";

export class TimestampFileNamer implements FileNamer {
  generate(originalName: string): string {
    const ext = originalName.substring(originalName.lastIndexOf("."));
    const timestamp = Date.now();
    return `${timestamp}${ext}`;
  }
}
```

---

## Dependency Injection

Access the registry for advanced scenarios:

```typescript
import { getRegistry, TOKENS } from "media-drive/registry";

const registry = getRegistry();

// Register custom services
registry.registerInstance(TOKENS.LOGGER, myLogger);

// Resolve dependencies
const config = registry.resolve(TOKENS.CONFIG);
```

---

## Custom Logger

Replace the default logger:

```typescript
import { Logger, setLogger } from "media-drive/core";

class WinstonLogger implements Logger {
  constructor(private winston: any) {}

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }
}

// Set globally
setLogger(new WinstonLogger(winstonInstance));
```

---

## Worker Process

Set up a separate worker for background jobs:

```typescript
// worker.ts
import { createMediaLibrary } from "media-drive";
import { BullMQDriver } from "media-drive/queue";
import { SharpProcessor } from "media-drive/conversions";
import { createStorageDriver } from "media-drive/storage";

const processor = new SharpProcessor();
const storage = createStorageDriver(diskConfig);

const queueDriver = new BullMQDriver({
  name: "media-conversions",
  redis: { host: "localhost", port: 6379 },
});

// Initialize worker
queueDriver.initWorker(async (jobData) => {
  // Fetch original file
  const buffer = await storage.get(jobData.originalPath);

  // Process conversions
  const results = await processor.process(buffer, jobData.conversions);

  // Store converted files
  for (const [name, result] of Object.entries(results)) {
    const path = `${jobData.modelType}/${jobData.modelId}/conversions/${name}.jpg`;
    await storage.put(path, result.buffer);
  }

  return { success: true };
});

console.log("Worker started");
```

---

## Testing

### Mock Storage Driver

```typescript
import { StorageDriver } from "media-drive/core";

export class MockStorageDriver implements StorageDriver {
  private files = new Map<string, Buffer>();

  async put(path: string, contents: Buffer | string): Promise<any> {
    const buffer =
      typeof contents === "string" ? Buffer.from(contents) : contents;
    this.files.set(path, buffer);
    return { path, size: buffer.length };
  }

  async get(path: string): Promise<Buffer> {
    return this.files.get(path) || Buffer.from("");
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  url(path: string): string {
    return `http://localhost/${path}`;
  }

  async temporaryUrl(path: string): Promise<string> {
    return this.url(path);
  }

  clear(): void {
    this.files.clear();
  }
}
```

### Test Example

```typescript
import { createMediaLibrary } from "media-drive";
import { MockStorageDriver } from "./mock-storage";
import { InMemoryQueueDriver } from "media-drive/queue";

describe("MediaLibrary", () => {
  let mediaLibrary: MediaLibrary;
  let mockStorage: MockStorageDriver;

  beforeEach(() => {
    mockStorage = new MockStorageDriver();

    mediaLibrary = createMediaLibrary({
      providers: {
        storageDriver: mockStorage,
        queueDriver: new InMemoryQueueDriver(),
      },
    });
  });

  it("should attach file", async () => {
    const file = {
      originalname: "test.jpg",
      buffer: Buffer.from("test"),
      size: 4,
    } as Express.Multer.File;

    const media = await mediaLibrary.attachFile("User", "123", file);

    expect(media.model_type).toBe("User");
    expect(media.model_id).toBe("123");
    expect(mockStorage.exists(media.file_name)).toBeTruthy();
  });
});
```

---

## Performance Optimization

### Lazy Loading

```typescript
// Only load conversion processor when needed
const mediaLibrary = createMediaLibrary({
  providers: {
    conversionProcessor: undefined, // Disable conversions
  },
});
```

### Batch Operations

```typescript
// Upload multiple files efficiently
const files = await Promise.all(
  uploads.map((file) => mediaLibrary.attachFile("Post", postId, file))
);
```

### Caching URLs

```typescript
// Cache resolved URLs
const urlCache = new Map<string, string>();

async function getCachedUrl(mediaId: string): Promise<string> {
  if (urlCache.has(mediaId)) {
    return urlCache.get(mediaId)!;
  }

  const url = await mediaLibrary.resolveFileUrl(mediaId);
  urlCache.set(mediaId, url);
  return url;
}
```
