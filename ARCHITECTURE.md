# Media Drive v3 - Architecture Overview

## Summary

Media Drive v3 builds on the modular v2 architecture with enhanced HTTP features, built-in validation, and REST API capabilities. The package maintains **100% backward compatibility** while introducing powerful new features for modern web applications.

### Two Library Options

- **MediaLibrary** (`createMediaLibrary`): Core library with storage, conversions, and queue support
- **EnhancedMediaLibrary** (`createEnhancedMediaLibrary`): Extends MediaLibrary with built-in HTTP middleware, validation, multipart parsing, and REST API endpoints

## Key Achievements

### ✅ Modular Architecture

- **Core Contracts**: Well-defined interfaces for all major components
- **Dependency Injection**: Lightweight DI registry for component swapping
- **Strategy Pattern**: Pluggable file naming and path generation
- **Factory Pattern**: Clean instantiation with `createMediaLibrary()`

### ✅ Type Safety

- **Zod Validation**: Runtime config validation with TypeScript inference
- **Strict TypeScript**: `exactOptionalPropertyTypes` enabled
- **No `any` in Public API**: Fully typed contracts

### ✅ Extensibility

- **Storage Drivers**: Local, S3, BunnyCDN built-in; custom drivers supported
- **Conversion Processors**: Sharp processor included; swap for ImageMagick, etc.
- **Queue Drivers**: BullMQ and in-memory; add RabbitMQ, SQS, etc.
- **Path Generators**: Default, date-based, flat; create custom strategies
- **File Namers**: Random, original, UUID; implement custom naming

### ✅ Developer Experience

- **CLI Tools**: `init`, `doctor`, `migrate` commands
- **Comprehensive Docs**: Getting started, API reference, advanced usage
- **Express Integration**: Ready-to-use router with auth hooks
- **Logger Facade**: Pluggable logging (console, Winston, Pino)

### ✅ HTTP & Validation (v3)

- **Built-in Multipart Parsing**: No multer dependency needed
- **File Validation**: MIME types, content validation, size limits
- **REST API**: Auto-generated endpoints for upload, download, list, delete
- **Upload Progress**: Built-in progress tracking
- **Error Handling**: Express-compatible error middleware

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Factory Functions                              │
│  createMediaLibrary()  |  createEnhancedMediaLibrary()      │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
                ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────────┐
    │   MediaLibrary       │  │  EnhancedMediaLibrary    │
    │   (Core Features)    │  │  (HTTP + Core Features)  │
    │   - attachFile()     │  │  - All MediaLibrary      │
    │   - attachFromUrl()  │  │  - uploadMiddleware()    │
    │   - list()           │  │  - getRouter()           │
    │   - remove()         │  │  - attachFromRequest()   │
    │   - resolveFileUrl() │  │  - errorHandler()        │
    └───────────┬──────────┘  └────────────┬─────────────┘
                │                          │
                └──────────┬───────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│FileService  │   │UrlService   │   │QueueDriver  │
│- upload()   │   │- resolveUrl │   │- enqueue()  │
│- delete()   │   └─────────────┘   │- status()   │
└──────┬──────┘                     │- stats()    │
       │                            └─────────────┘
       │
  ┌────┴────┬──────────┬─────────────┐
  ▼         ▼          ▼             ▼
┌────────┐ ┌──────┐ ┌───────────┐ ┌────────┐
│Storage │ │Path  │ │File       │ │Convert │
│Driver  │ │Gen   │ │Namer      │ │Process │
└────────┘ └──────┘ └───────────┘ └────────┘
```

## Directory Structure

```
src/
├── core/                    # Core primitives & contracts
│   ├── contracts/           # Public interfaces
│   │   ├── storage-driver.ts
│   │   ├── conversion-processor.ts
│   │   ├── queue-driver.ts
│   │   ├── path-generator.ts
│   │   ├── file-namer.ts
│   │   ├── url-signer.ts
│   │   └── index.ts
│   ├── errors/              # Custom error types
│   │   └── index.ts
│   ├── logger/              # Logging facade
│   │   └── index.ts
│   ├── responders/          # HTTP response helpers
│   │   └── http.ts
│   ├── utils/               # Shared utilities
│   │   ├── response-keys.ts
│   │   └── index.ts
│   └── index.ts
│
├── config/                  # Zod-based configuration
│   ├── schema.ts            # Config schema & types
│   ├── loader.ts            # Env & file config loading
│   └── index.ts
│
├── registry/                # DI-lite registry
│   ├── tokens.ts            # Service tokens
│   ├── registry.ts          # Registry implementation
│   └── index.ts
│
├── storage/                 # Storage drivers
│   ├── local/
│   │   └── driver.local.ts
│   ├── s3/
│   │   └── driver.s3.ts
│   ├── bunnycdn/
│   │   └── driver.bunny.ts
│   ├── storage-factory.ts
│   └── index.ts
│
├── conversions/             # Image processors
│   ├── sharp-processor.ts
│   ├── helpers.ts
│   └── index.ts
│
├── queue/                   # Async job drivers
│   ├── bullmq-driver.ts
│   ├── in-memory-driver.ts
│   └── index.ts
│
├── strategies/              # File naming & path generation
│   ├── file-namers.ts
│   ├── path-generators.ts
│   └── index.ts
│
├── media/                   # Application services
│   ├── media-library.ts     # Main orchestrator
│   ├── enhanced-media-library.ts  # Enhanced with HTTP support
│   ├── file-service.ts      # File operations
│   ├── url-service.ts       # URL resolution
│   ├── file-type-detector.ts
│   └── index.ts
│
├── validation/              # File validation
│   ├── file-validator.ts    # Validation framework
│   └── index.ts
│
├── http/                    # Express adapters
│   ├── api-router.ts        # REST API routes
│   ├── multipart.ts         # Multipart parsing middleware
│   └── index.ts
│
├── migration/               # Database migration utilities
│   └── index.ts
│
├── cli/                     # Command-line tools
│   ├── commands/
│   │   ├── init.ts
│   │   ├── doctor.ts
│   │   └── migrate.ts
│   └── index.ts
│
├── factory.ts               # Main factory function
├── types.ts                 # Shared TypeScript types
└── index.ts                 # Package entry point
```

## Design Patterns Used

1. **Factory Pattern**: `createMediaLibrary()` handles complex instantiation
2. **Strategy Pattern**: Interchangeable file namers and path generators
3. **Dependency Injection**: Registry-based DI for testability
4. **Adapter Pattern**: HTTP routers adapt MediaLibrary to web frameworks
5. **Facade Pattern**: Logger and config facades simplify interfaces
6. **Repository Pattern**: Prisma as persistence layer

## Breaking Changes

**None!** The public API remains unchanged:

```typescript
// v1 (still works)
const service = new MediaLibrary(prisma);
await service.attachFile("User", "123", file);

// v2/v3 Standard (recommended for core features)
const service = createMediaLibrary({ prisma });
await service.attachFile("User", "123", file);

// v3 Enhanced (recommended for HTTP features)
const service = createEnhancedMediaLibrary({ prisma });
app.use("/api/media", service.getRouter());
```

## Migration Path

1. **Phase 1**: Continue using v1 API (works as-is)
2. **Phase 2**: Switch to `createMediaLibrary()` factory
3. **Phase 3**: Leverage new features (custom drivers, strategies, etc.)
4. **Phase 4** (v3): Use `createEnhancedMediaLibrary()` for HTTP features

## Testing Strategy

- **Unit Tests**: All core modules and utilities
- **Integration Tests**: Storage drivers with real backends
- **Contract Tests**: Ensure all drivers meet interface contracts
- **Golden Tests**: Path generation and file naming
- **Mock Drivers**: In-memory implementations for testing

## Performance Considerations

1. **Lazy Loading**: Components loaded only when needed
2. **Async Jobs**: Heavy processing offloaded to queue
3. **Streaming**: Large files handled with streams (where possible)
4. **Caching**: URL resolution can be cached at app level

## Security Features

1. **MIME Type Validation**: Server-side detection using `file-type`
2. **Content Validation**: Magic number checking to prevent spoofing
3. **File Size Limits**: Configurable per-disk and per-upload limits
4. **Signed URLs**: Temporary access to private files
5. **Forbidden MIME Types**: Blacklist dangerous file types
6. **Sanitization**: File names and paths sanitized
7. **Built-in Validation**: EnhancedMediaLibrary includes comprehensive validation

## EnhancedMediaLibrary Features

The `EnhancedMediaLibrary` extends `MediaLibrary` with HTTP capabilities:

### HTTP Middleware

- **Multipart Parsing**: Built-in `uploadMiddleware()` replaces multer dependency
- **File Upload**: Single file, multiple files, and streaming uploads
- **Progress Tracking**: Real-time upload progress via `req.uploadProgress`
- **Error Handling**: Express-compatible `errorHandler()` middleware

### Validation

- **MIME Type Validation**: Server-side detection with magic number checking
- **File Size Limits**: Per-upload and per-disk limits
- **Content Validation**: Prevents file type spoofing
- **Custom Rules**: Extensible validation API with sync/async support

### REST API

- **Auto-generated Routes**: `getRouter()` creates Express router with:
  - `POST /upload` - Upload files
  - `GET /:id` - Get file metadata
  - `GET /:id/download` - Download files
  - `GET /` - List files with filtering
  - `DELETE /:id` - Delete files
  - `GET /health` - Health check

### Usage Example

```typescript
import { createEnhancedMediaLibrary } from "media-drive";
import express from "express";

const mediaLibrary = createEnhancedMediaLibrary({
  config: {
    disk: "local",
    validation: {
      maxFileSize: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png"],
    },
  },
});

const app = express();
app.use("/api/media", mediaLibrary.getRouter());
```

## Extensibility Examples

### Custom Storage Driver

```typescript
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

const mediaLibrary = createMediaLibrary({
  providers: { storageDriver: new CloudflareR2Driver() },
});
```

### Custom File Namer

```typescript
class TimestampFileNamer implements FileNamer {
  generate(originalName: string): string {
    const ext = path.extname(originalName);
    return `${Date.now()}${ext}`;
  }
}
```

## Future Enhancements

- [ ] Video processing support (FFmpeg integration)
- [ ] More storage drivers (Azure Blob, Google Cloud Storage)
- [ ] CDN integration helpers
- [ ] Responsive images with srcset generation
- [ ] Background job UI dashboard
- [ ] Batch operations API
- [ ] Metadata extraction (EXIF, IPTC)
- [ ] Image optimization presets

## Contributors

Built with ❤️ by [Dadda Abdelghafour](https://www.abdelghafourdadda.dev)

Inspired by [Laravel Media Library](https://github.com/spatie/laravel-medialibrary)

---

**Version**: 3.2.0  
**License**: MIT
