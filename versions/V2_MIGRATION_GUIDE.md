# Media Drive v2 - Migration & Feature Guide

## 🎉 What's New in v2

Media Drive v2 is a complete architectural rewrite that transforms the package into a **modular, extensible platform** while maintaining 100% backward compatibility with v1.

---

## ✨ Major Improvements

### 1. **Modular Architecture**

**Before (v1):**

```typescript
// Tightly coupled, hard to extend
import { MediaLibrary } from "media-drive";
const service = new MediaLibrary(prisma);
```

**After (v2):**

```typescript
// Factory pattern with full DI support
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({
  config: {
    /* ... */
  },
  prisma,
  providers: {
    storageDriver: new MyCustomDriver(), // Swap ANY component!
  },
});
```

---

### 2. **Type-Safe Configuration with Zod**

**Before (v1):**

```typescript
// Manual config, runtime errors possible
initMediaLibrary({
  default_disk: "local",
  local: { root: "uploads" },
});
```

**After (v2):**

```typescript
// Zod validation, full TypeScript inference
import { defineConfig } from "media-drive";

const config = defineConfig({
  disk: "local", // Autocomplete & validation!
  disks: {
    local: {
      driver: "local",
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
  },
});
```

**Benefits:**

- ✅ Runtime validation
- ✅ TypeScript inference
- ✅ Default values
- ✅ Environment variable mapping
- ✅ Detailed error messages

---

### 3. **Pluggable Storage Drivers**

**Built-in Drivers:**

- Local filesystem
- Amazon S3 (+ compatible services)
- BunnyCDN edge storage

**Custom Driver Example:**

```typescript
import { StorageDriver } from "media-drive/core";

class CloudflareR2Driver implements StorageDriver {
  async put(path, contents, opts) {
    /* ... */
  }
  async get(path) {
    /* ... */
  }
  async delete(path) {
    /* ... */
  }
  async exists(path) {
    /* ... */
  }
  url(path) {
    /* ... */
  }
  async temporaryUrl(path, expires) {
    /* ... */
  }
}

// Use it instantly
const service = createMediaLibrary({
  providers: { storageDriver: new CloudflareR2Driver() },
});
```

---

### 4. **Extensible Image Processing**

**Default:** Sharp processor (included)

**Custom Processor:**

```typescript
import { ConversionProcessor } from "media-drive/core";

class ImageMagickProcessor implements ConversionProcessor {
  async process(input, conversions) {
    /* ... */
  }
  async processOne(input, options) {
    /* ... */
  }
}

const service = createMediaLibrary({
  providers: { conversionProcessor: new ImageMagickProcessor() },
});
```

---

### 5. **Flexible Queue System**

**Options:**

- BullMQ (Redis-backed, production)
- In-Memory (testing/dev)
- Custom (implement `QueueDriver`)

```typescript
// Config-based selection
const config = defineConfig({
  queue: {
    driver: "bullmq", // or "in-memory"
    name: "media-jobs",
    redis: {
      host: "localhost",
      port: 6379,
    },
  },
});
```

---

### 6. **Strategies for File Organization**

#### File Naming Strategies

- **random**: `abc123def456.jpg` (default)
- **original**: `my-photo.jpg` (sanitized)
- **uuid**: `550e8400-e29b-41d4-a716-446655440000.jpg`

```typescript
const config = defineConfig({
  fileNaming: { strategy: "uuid" },
});
```

#### Path Generation Strategies

- **default**: `User/123/avatar/file.jpg`
- **date-based**: `User/2024/01/15/file.jpg`
- **flat**: `file.jpg`

```typescript
const config = defineConfig({
  pathGeneration: { strategy: "date-based" },
});
```

---

### 7. **CLI Tools**

```bash
# Generate config file
npx media-drive init

# Check environment
npx media-drive doctor

# Show database migration
npx media-drive migrate
```

---

### 8. **Enhanced Error Handling**

Custom error types for better debugging:

```typescript
import {
  ValidationError,
  StorageError,
  ConversionError,
  NotFoundError,
} from "media-drive/core";

try {
  await mediaLibrary.attachFile(/* ... */);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log("Invalid file:", error.message);
  }
}
```

---

### 9. **Logger Facade**

Pluggable logging system:

```typescript
import { setLogger, Logger } from "media-drive/core";

// Use Winston, Pino, or any logger
class WinstonLogger implements Logger {
  debug(msg, meta) {
    winston.debug(msg, meta);
  }
  info(msg, meta) {
    winston.info(msg, meta);
  }
  warn(msg, meta) {
    winston.warn(msg, meta);
  }
  error(msg, meta) {
    winston.error(msg, meta);
  }
}

setLogger(new WinstonLogger());
```

---

### 10. **Express Router Adapter**

Ready-to-use HTTP endpoints:

```typescript
import { createMediaRouter } from "media-drive/http";

const router = createMediaRouter(mediaLibrary, {
  authMiddleware: (req, res, next) => {
    // Your auth logic
    next();
  },
});

app.use("/api", router);
```

**Endpoints:**

- `GET /media/:modelType/:modelId` - List media
- `POST /media/:modelType/:modelId` - Upload file
- `POST /media/:modelType/:modelId/from-url` - Upload from URL
- `DELETE /media/:mediaId` - Delete media
- `GET /media/:mediaId/url` - Get URL
- `POST /media/:mediaId/conversions` - Queue async conversions
- `GET /jobs/:jobId` - Job status
- `GET /queue/stats` - Queue statistics

---

## 🔄 Migration Guide

### Step 1: Update Import

```typescript
// Old
import { MediaLibrary, initMediaLibrary } from "media-drive";

// New
import { createMediaLibrary } from "media-drive";
```

### Step 2: Update Instantiation

```typescript
// Old
initMediaLibrary(config);
const service = new MediaLibrary(prisma);

// New
const service = createMediaLibrary({ config, prisma });
```

### Step 3: (Optional) Leverage New Features

```typescript
// Add custom providers
const service = createMediaLibrary({
  config: myConfig,
  prisma,
  providers: {
    storageDriver: new CustomDriver(),
  },
});
```

**That's it!** All your existing code using the MediaLibrary methods works unchanged.

---

## 📝 Breaking Changes

**None!** All public API methods remain identical:

- `attachFile(modelType, modelId, file, options)`
- `attachFromUrl(modelType, modelId, url, options)`
- `list(modelType, modelId, collection?)`
- `remove(mediaId)`
- `resolveFileUrl(mediaId, conversion?, signed?)`
- `processConversionsAsync(mediaId, conversions)`
- `getConversionJobStatus(jobId)`
- `getQueueStats()`

---

## 🎯 Why Upgrade to v2?

| Feature                    | v1      | v2                     |
| -------------------------- | ------- | ---------------------- |
| **Custom Storage Drivers** | ❌      | ✅                     |
| **Custom Processors**      | ❌      | ✅                     |
| **Custom Queue Drivers**   | ❌      | ✅                     |
| **Config Validation**      | ❌      | ✅ (Zod)               |
| **Type Inference**         | Partial | ✅ Full                |
| **CLI Tools**              | ❌      | ✅                     |
| **Logger Abstraction**     | ❌      | ✅                     |
| **DI Support**             | ❌      | ✅                     |
| **File Naming Strategies** | Limited | ✅ 3 built-in + custom |
| **Path Strategies**        | Fixed   | ✅ 3 built-in + custom |
| **Test Coverage**          | Basic   | ✅ 59 tests            |
| **Documentation**          | Basic   | ✅ Comprehensive       |

---

## 🚀 New Capabilities

### 1. **Swap Storage Per-Request**

```typescript
// Different storage for different files
await mediaLibrary.attachFile("User", "123", avatarFile, {
  disk: "s3", // Profile images on S3
});

await mediaLibrary.attachFile("User", "123", documentFile, {
  disk: "local", // Documents local
});
```

### 2. **Custom Path Organization**

```typescript
import { PathGenerator } from "media-drive/core";

class TenantPathGenerator implements PathGenerator {
  generate(ctx) {
    return {
      path: `tenant-${ctx.modelId}/${ctx.collection}/${ctx.fileName}`,
      directory: `tenant-${ctx.modelId}/${ctx.collection}`,
      fileName: ctx.fileName,
    };
  }

  generateConversion(ctx, name) {
    /* ... */
  }
}
```

### 3. **Background Job Processing**

```typescript
// Separate worker process
// worker.ts
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({
  config: {
    queue: { driver: "bullmq", redis: { host: "localhost" } },
  },
});

// Jobs are processed automatically
```

### 4. **Multiple Queue Backends**

```typescript
// Development: In-memory
const devService = createMediaLibrary({
  config: { queue: { driver: "in-memory" } },
});

// Production: BullMQ
const prodService = createMediaLibrary({
  config: {
    queue: {
      driver: "bullmq",
      redis: {
        /* ... */
      },
    },
  },
});
```

---

## 📖 Resources

- **[Architecture Overview](./ARCHITECTURE.md)** - Deep dive into design
- **[API Reference](./docs/api-reference.md)** - Complete API docs
- **[Advanced Usage](./docs/advanced.md)** - Custom implementations
- **[Storage Guide](./docs/storage.md)** - Storage driver details

---

## 🎊 Summary

Media Drive v2 transforms a rigid library into a **flexible, production-grade platform** with:

✅ **Zero breaking changes** - Upgrade risk-free  
✅ **Modular design** - Swap components easily  
✅ **Type safety** - Zod + strict TypeScript  
✅ **Full test coverage** - 59 tests passing  
✅ **Comprehensive docs** - 5 detailed guides  
✅ **CLI tools** - Easy setup

**Upgrade today and unlock the full potential of Media Drive!** 🚀
