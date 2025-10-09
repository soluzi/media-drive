# Media Drive v2 - Architecture Overview

## Summary

Media Drive v2 is a complete architectural rewrite of the media library package with modularity, extensibility, and type safety as core principles. The refactoring maintains **100% backward compatibility** with the public API while introducing a clean, plugin-based architecture.

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

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   createMediaLibrary()                  │
│                    (Factory Function)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │   MediaLibrary         │  ◄── Main Orchestrator
           │   - attachFile()       │
           │   - attachFromUrl()    │
           │   - list()             │
           │   - remove()           │
           │   - resolveFileUrl()   │
           └────────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│FileService  │ │UrlService   │ │QueueDriver  │
│- upload()   │ │- resolveUrl │ │- enqueue()  │
│- delete()   │ └─────────────┘ │- status()   │
└──────┬──────┘                 │- stats()    │
       │                        └─────────────┘
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
│   │   └── url-signer.ts
│   ├── errors/              # Custom error types
│   ├── logger/              # Logging facade
│   └── utils/               # Shared utilities
│
├── config/                  # Zod-based configuration
│   ├── schema.ts            # Config schema & types
│   └── loader.ts            # Env & file config loading
│
├── registry/                # DI-lite registry
│   ├── tokens.ts            # Service tokens
│   └── registry.ts          # Registry implementation
│
├── storage/                 # Storage drivers
│   ├── local/
│   │   └── driver.local.ts
│   ├── s3/
│   │   └── driver.s3.ts
│   ├── bunnycdn/
│   │   └── driver.bunny.ts
│   └── storage-factory.ts
│
├── conversions/             # Image processors
│   ├── sharp-processor.ts
│   └── helpers.ts
│
├── queue/                   # Async job drivers
│   ├── bullmq-driver.ts
│   └── in-memory-driver.ts
│
├── strategies/              # File naming & path generation
│   ├── file-namers.ts
│   └── path-generators.ts
│
├── media/                   # Application services
│   ├── media-library.ts     # Main orchestrator
│   ├── file-service.ts      # File operations
│   ├── url-service.ts       # URL resolution
│   ├── validation.ts        # Input validation
│   └── file-type-detector.ts
│
├── http/                    # Express adapters
│   ├── express-router.ts
│   └── middlewares.ts
│
├── cli/                     # Command-line tools
│   ├── commands/
│   │   ├── init.ts
│   │   ├── doctor.ts
│   │   └── migrate.ts
│   └── index.ts
│
├── factory.ts               # Main factory function
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

// v2 (recommended)
const service = createMediaLibrary({ prisma });
await service.attachFile("User", "123", file);
```

## Migration Path

1. **Phase 1**: Continue using v1 API (works as-is)
2. **Phase 2**: Switch to `createMediaLibrary()` factory
3. **Phase 3**: Leverage new features (custom drivers, strategies, etc.)

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
2. **File Size Limits**: Configurable per-disk limits
3. **Signed URLs**: Temporary access to private files
4. **Forbidden MIME Types**: Blacklist dangerous file types
5. **Sanitization**: File names and paths sanitized

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

Built with ❤️ by Dadda Abdelghafour

Inspired by [Laravel Media Library](https://github.com/spatie/laravel-medialibrary)

---

**Version**: 2.0.0  
**License**: MIT
