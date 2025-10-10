# Media Drive v3

> Modular, TypeScript-first media library for Node.js applications  
> Inspired by Laravel Media Library

[![npm version](https://badge.fury.io/js/media-drive.svg)](https://badge.fury.io/js/media-drive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚠️ Upgrading from v2.x?

See the [Migration Guide (v2 → v3)](./docs/MIGRATION_V3.md) for upgrading instructions. v3.0 introduces **stored file paths** to support non-deterministic path generators.

## ✨ Features

- 📦 **Modular Architecture** - Plug in your own storage drivers, processors, or queues
- 🔧 **Type-Safe Configuration** - Zod-validated config with TypeScript inference
- 💾 **Multiple Storage Drivers** - Local, S3, BunnyCDN built-in
- 🎨 **Image Processing** - Sharp-powered conversions with async job support
- ⚡ **Async Job Processing** - BullMQ integration for background tasks
- 🔒 **Security** - MIME type validation, file size limits, signed URLs
- 🛠️ **CLI Tools** - Generate configs, run diagnostics, manage migrations
- 🎯 **Non-Breaking API** - Backward compatible with v1

## 📦 Installation

```bash
npm install media-drive
```

### Peer Dependencies

```bash
npm install @prisma/client prisma
```

## 🚀 Quick Start

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

```typescript
import { createMediaLibrary } from "media-drive";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mediaLibrary = createMediaLibrary({ prisma });

// Attach a file
const media = await mediaLibrary.attachFile("User", "123", req.file, {
  collection: "avatar",
  conversions: {
    thumb: { width: 150, height: 150, fit: "cover" },
  },
});

// Get URL
const url = await mediaLibrary.resolveFileUrl(media.id);
```

## 📖 Documentation

- **[Getting Started](./docs/getting-started.md)** - Installation and basic usage
- **[Configuration](./docs/configuration.md)** - Complete configuration guide
- **[API Reference](./docs/api-reference.md)** - Full API documentation
- **[Storage Drivers](./docs/storage.md)** - Storage backend setup
- **[Advanced Usage](./docs/advanced.md)** - Custom drivers and strategies
- **[Examples](./docs/examples/)** - Real-world usage examples
- **[Architecture](./ARCHITECTURE.md)** - System design and patterns

## 🏗️ Architecture

Media Drive v2 features a clean, modular architecture:

```
src/
  core/           # Core contracts & primitives
    contracts/    # Public interfaces
    errors/       # Custom error types
    logger/       # Logging facade
    utils/        # Shared utilities
  config/         # Zod-based configuration
  registry/       # DI-lite registry
  storage/        # Storage drivers
  conversions/    # Image processors
  queue/          # Async job drivers
  strategies/     # File naming & path generation
  media/          # Application services
  http/           # Express adapters
  cli/            # Command-line tools
```

## 🔌 Extensibility

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

## 🧪 Testing

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

**Test Results:**

- ✅ 59 tests passing
- ✅ 7 test suites
- ✅ 100% pass rate

## 📝 Migration from v1

Media Drive v2 maintains backward compatibility:

```typescript
// v1 (still works with deprecation warning)
import { initMediaLibrary, MediaLibrary } from "media-drive";

initMediaLibrary(config);
const service = new MediaLibrary(prisma);

// v2 (recommended)
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({ config, prisma });
```

All public methods (`attachFile`, `attachFromUrl`, `list`, `remove`, `resolveFileUrl`, etc.) remain unchanged.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details.

## 📄 License

MIT © [Dadda Abdelghafour](https://github.com/soluzi)

## 🙏 Acknowledgments

Inspired by [Laravel Media Library](https://github.com/spatie/laravel-medialibrary) by Spatie.

---

## 📊 Stats

- **59 tests passing** - 100% test coverage for core modules
- **6 Cursor Rules** - AI-friendly codebase documentation
- **6 documentation guides** - Comprehensive user docs
- **4 usage examples** - Real-world implementation patterns
- **3 CLI commands** - Easy setup and diagnostics
- **Zero TypeScript errors** - Strict mode compliant
- **54 KB bundle** - Lightweight and tree-shakable

---

**v2.0.0** - Complete architecture rewrite with modularity, extensibility, and type safety.
