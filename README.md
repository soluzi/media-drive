# Media Drive v3.2.0

> Modular, TypeScript-first media library for Node.js applications  
> Inspired by Laravel Media Library

[![npm version](https://badge.fury.io/js/media-drive.svg)](https://badge.fury.io/js/media-drive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Upgrading?

- **From v3.1.x?** See [CHANGELOG.md](./CHANGELOG.md#320---2025-11-07) - v3.2.0 has **breaking changes for HTTP API consumers** (response format changed)
- **From v2.x?** See the **[V3 Migration & Feature Guide](./versions/V3_MIGRATION_GUIDE.md)** - v3.0 introduces **stored file paths** to support non-deterministic path generators
- **From v1.x?** See [V2 Migration Guide](./versions/V2_MIGRATION_GUIDE.md)

Quick links:

- [CHANGELOG.md](./CHANGELOG.md) - Latest changes and breaking changes
- [Full V3 Feature Guide](./versions/V3_MIGRATION_GUIDE.md) - Complete overview with examples
- [V2 Migration Guide](./versions/V2_MIGRATION_GUIDE.md) - If upgrading from v1

## Features

- **Modular Architecture** - Plug in your own storage drivers, processors, or queues
- **Type-Safe Configuration** - Zod-validated config with TypeScript inference
- **Multiple Storage Drivers** - Local, S3, BunnyCDN built-in
- **Image Processing** - Sharp-powered conversions with async job support
- **Async Job Processing** - BullMQ integration for background tasks
- **Security** - MIME type validation, file size limits, signed URLs
- **CLI Tools** - Generate configs, run diagnostics, manage migrations
- **Backward Compatible** - Programmatic API remains unchanged from v1

### v3 Enhanced Features (EnhancedMediaLibrary)

- **Built-in Multipart Parsing** - No multer dependency needed
- **File Validation** - MIME types, content validation, size limits
- **REST API** - Auto-generated endpoints for upload, download, list, delete
- **Upload Progress** - Built-in progress tracking
- **Error Handling** - Express-compatible error middleware
- **Standardized API Responses** - Consistent response format with HTTP response helpers
- **Multi-Disk Support** - Pre-initialized storage drivers and dynamic disk selection

## Installation

```bash
npm install media-drive
```

### Peer Dependencies

```bash
npm install @prisma/client prisma
```

## Quick Start

> **New to v3?** We offer two setups: **Standard** (use with multer) and **Enhanced** (built-in multipart + validation). See [Choosing Your Setup](./docs/choosing-your-setup.md) to decide.

### 1. Initialize

```bash
npx media-drive init
npx media-drive migrate
npx prisma migrate dev
npx prisma generate
```

### 2. Configure

```typescript
// media.config.ts
import { defineConfig } from "media-drive";

export default defineConfig({
  disk: "local",
  disks: {
    local: {
      driver: "local",
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
  },
});
```

### 3. Use

**Option A: Standard (with multer)**

```typescript
import { createMediaLibrary } from "media-drive";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const mediaLibrary = createMediaLibrary({ prisma });

app.post("/upload", upload.single("file"), async (req, res) => {
  const media = await mediaLibrary.attachFile("User", "123", req.file!, {
    collection: "avatar",
    conversions: { thumb: { width: 150, height: 150 } },
  });

  res.json({ url: await mediaLibrary.resolveFileUrl(media.id) });
});
```

**Option B: Enhanced (no multer needed!)**

```typescript
import { createEnhancedMediaLibrary } from "media-drive";

const mediaLibrary = createEnhancedMediaLibrary({
  config: {
    disk: "local",
    http: { enabled: true, multipart: { enabled: true } },
    validation: {
      fileTypes: { images: ["jpeg", "png"], documents: ["pdf"] },
    },
  },
});

app.post(
  "/upload",
  mediaLibrary.uploadMiddleware(), // Built-in multipart parsing!
  async (req, res) => {
    const result = await mediaLibrary.attachFromRequest(req, {
      modelType: "User",
      modelId: "123",
    });
    res.json(result);
  }
);
```

> **Which one?** See [Choosing Your Setup](./docs/choosing-your-setup.md)

## Documentation

- **[Choosing Your Setup](./docs/choosing-your-setup.md)** - Standard vs Enhanced: Which to use?
- **[Getting Started](./docs/getting-started.md)** - Installation and basic usage
- **[Configuration](./docs/configuration.md)** - Complete configuration guide
- **[API Reference](./docs/api-reference.md)** - Full API documentation
- **[Storage Drivers](./docs/storage.md)** - Storage backend setup
- **[Advanced Usage](./docs/advanced.md)** - Custom drivers and strategies
- **[Examples](./docs/examples/)** - Real-world usage examples
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Architecture](./ARCHITECTURE.md)** - System design and patterns

## Architecture

Media Drive v3 features a clean, modular architecture:

```
src/
  core/           # Core contracts & primitives
    contracts/    # Public interfaces
    errors/       # Custom error types
    logger/       # Logging facade
    responders/  # HTTP response helpers
    utils/        # Shared utilities
  config/         # Zod-based configuration
  registry/       # DI-lite registry
  storage/        # Storage drivers
  conversions/    # Image processors
  queue/          # Async job drivers
  strategies/     # File naming & path generation
  media/          # Application services
  validation/     # File validation framework
  http/           # Express adapters
  migration/      # Database migration utilities
  cli/            # Command-line tools
  factory.ts      # Main factory function
  types.ts        # Shared TypeScript types
```

## Extensibility

Easily swap or extend any component:

```typescript
import { createMediaLibrary } from "media-drive";
import { MyCustomStorageDriver } from "./my-storage";

const mediaLibrary = createMediaLibrary({
  providers: {
    storageDriver: new MyCustomStorageDriver(),
    conversionProcessor: new MyImageProcessor(),
    queueDriver: new MyQueueDriver(),
  },
});
```

See [Advanced Usage](./docs/advanced.md) for creating custom drivers.

## Testing

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

**Test Results:**

- 59 tests passing
- 7 test suites
- 100% pass rate

## Migration

### From v1/v2

Media Drive v3 maintains backward compatibility for programmatic API:

```typescript
// v1 (still works with deprecation warning)
import { initMediaLibrary, MediaLibrary } from "media-drive";

initMediaLibrary(config);
const service = new MediaLibrary(prisma);

// v2/v3 Standard (recommended for core features)
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({ config, prisma });

// v3 Enhanced (recommended for HTTP features)
import { createEnhancedMediaLibrary } from "media-drive";

const service = createEnhancedMediaLibrary({ config, prisma });
app.use("/api/media", service.getRouter());
```

All public methods (`attachFile`, `attachFromUrl`, `list`, `remove`, `resolveFileUrl`, etc.) remain unchanged.

### From v3.1.x to v3.2.0

⚠️ **Breaking Changes for HTTP API Consumers**: Response format has changed. See [CHANGELOG.md](./CHANGELOG.md#320---2025-11-07) for migration guide.

- Error responses: `{ error: string }` → `{ success: false, message: string }`
- Upload responses: Data structure changed (now nested under `data.media`)
- Delete responses: Now includes `data: {}` field

Programmatic API (`MediaLibrary` and `EnhancedMediaLibrary` methods) remains unchanged.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details.

## License

MIT © [Dadda Abdelghafour](https://www.abdelghafourdadda.dev)

## Acknowledgments

Inspired by [Laravel Media Library](https://github.com/spatie/laravel-medialibrary) by Spatie.

---

## Stats

- **59 tests passing** - 100% test coverage for core modules
- **6 Cursor Rules** - AI-friendly codebase documentation
- **6 documentation guides** - Comprehensive user docs
- **4 usage examples** - Real-world implementation patterns
- **3 CLI commands** - Easy setup and diagnostics
- **Zero TypeScript errors** - Strict mode compliant
- **54 KB bundle** - Lightweight and tree-shakable

---

**v3.2.0** - Enhanced HTTP features, built-in validation, REST API, and comprehensive response helpers.
