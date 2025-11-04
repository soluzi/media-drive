# Changelog

All notable changes to Media Drive will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-11-04

### ✨ Added

#### **Enhanced Logging System**

- **Configurable Logging** - Enable/disable logging via `logging.enabled` flag
- **Environment Variable Support** - `MEDIA_LOG_ENABLED` and `MEDIA_LOG_LEVEL` environment variables
- **Multiple Logger Implementations**
  - `ConsoleLogger` - Standard level-based filtering (debug < info < warn < error)
  - `SelectiveConsoleLogger` - Per-level enable/disable granular control
  - `NoOpLogger` - Silent logger for when logging is disabled
- **Enhanced Logger Factory** - `createLogger()` supports level hierarchy or per-level toggles
- **Comprehensive JSDoc Documentation** - Full type annotations and usage examples (236 lines added)

#### **Multi-Disk Storage Support**

- **Storage Driver Caching** - MediaLibrary caches storage drivers per disk for performance
- **Dynamic Disk Selection** - FileService methods accept optional `storageDriver` parameter
- **Enhanced Storage Factory** - Improved disk configuration handling and driver creation
- **Multi-Disk Operations** - Upload and delete operations can target specific disks

### 🔄 Changed

- **Logger configuration**: Enhanced with `enabled` flag and optional per-level toggles (`levels` object)
- **Logger factory**: Updated `createLogger()` to accept `enabled` flag and optional `levels` configuration
- **Factory functions**: Both `createMediaLibrary()` and `createEnhancedMediaLibrary()` now respect logging configuration
- **FileService**: Added optional `storageDriver` parameter to `upload()` and `delete()` methods for multi-disk operations
- **MediaLibrary**: Added storage driver caching and `getStorageDriver()` method for multi-disk support
- **Storage factory**: Enhanced with improved disk configuration handling (67 lines changed)

### 🔧 Fixed

- Fixed migration utility import paths in documentation and JSDoc examples (changed from `media-drive/migration` and `media-drive/strategies` to `media-drive`)
- Updated V3 migration guide with correct import paths and CLI command documentation

### 📦 Backward Compatibility

- ✅ **100% backward compatible with v3.0.0**
- All new features are opt-in via configuration
- Existing code continues to work without changes

---

## [3.0.0] - 2025-10-12

### 🎉 Major Release - Enhanced Features

This is a major release that adds comprehensive HTTP features while maintaining 100% backward compatibility with v2.

### ✨ Added

#### **Built-in HTTP Features (Phase 1 Complete)**

- **Multipart Parsing** - Built-in file upload handling (eliminates multer dependency)
  - Single file, multiple files, and streaming uploads
  - Configurable file size limits and field limits
  - Progress tracking support
  - Custom file filtering
- **File Validation System** - Comprehensive validation framework
  - MIME type validation (allowed/blocked lists)
  - Content validation with magic number checking
  - File size limits
  - Image dimension validation
  - Custom validation rules (sync & async)
  - Extensible validator API
- **REST API Endpoints** - Auto-generated API router
  - POST `/upload` - Upload files
  - GET `/:id/download` - Download files
  - GET `/:id` - Get file info
  - GET `/` - List files
  - DELETE `/:id` - Delete files
  - GET `/health` - Health check
- **Enhanced Media Library** - `createEnhancedMediaLibrary()`
  - All standard features + HTTP capabilities
  - Built-in middleware (no multer needed)
  - Validation integration
  - Error handling middleware
  - Upload progress tracking

#### **Enhanced Type Safety**

- Reduced `any` usage by 90% (from 30+ to 3 instances)
- All remaining `any` usages documented and justified
- Proper TypeScript types throughout
- Exported config enum types (`DiskDriverType`, `QueueDriverType`, etc.)
- Created `CreateEnhancedMediaLibraryOptions` interface

#### **Prisma Schema Improvements**

- Added `path` column to store generated file paths
- Added index on `path` column for performance
- Default values for JSON fields (`manipulations`, `custom_properties`, `responsive_images`)
- Nullable `path` field for v2 backward compatibility

#### **Documentation**

- **Choosing Your Setup Guide** - Helps users decide between standard and enhanced
- **Troubleshooting Guide** - Common issues and solutions
- **Usage Examples** - Enhanced features demonstrations
- **Cursor Rules** - No `any` types rule for AI assistance
- Updated README with both setup options

#### **Testing**

- Added 69 new tests (59 → 128 tests, +117% increase)
- Multipart middleware tests (25 tests)
- File validator tests (27 tests)
- Enhanced media library tests (18 tests)
- API router tests (16 tests)
- Updated Sharp mock to include `metadata()` method
- All tests passing (128/128)

### 🔄 Changed

- **Version**: Bumped to 3.0.0
- **Package description**: Updated to mention new features
- **README**: Now shows both standard and enhanced setup options
- **MediaRecord interface**: Changed `path` from `string` to `string | null`
- **Logger interface**: Changed `meta` parameter from `any` to `Record<string, unknown> | undefined`
- **Queue types**: Changed `result` from `any` to `unknown`
- **Error handling**: Proper type guards with `instanceof Error`

### 🗑️ Removed

- Removed 20 unused v1/v2 legacy files (-31% codebase)
  - Old HTTP layer (express-router.ts, middlewares.ts)
  - Old media layer (config.ts, service.ts, routes.ts, job-routes.ts, validation.ts)
  - Duplicate storage drivers in `src/media/storage/`
  - Old utilities in `src/media/utils/`
  - Old jobs system in `src/media/jobs/`
- Removed duplicate `MediaRecord` interface from media-library.ts
- Cleaned up unused imports and type casts

### 🔧 Fixed

- Fixed `createEnhancedMediaLibrary` to properly pass all dependencies
- Fixed multipart middleware return types for Express compatibility
- Fixed S3 client config to use explicit interface instead of `any`
- Fixed BullMQ connection options to use proper `ConnectionOptions` type
- Fixed storage factory switch statement (exhaustive cases, no default)
- Fixed migration path checks (removed unnecessary `as any` casts)

### 📦 Backward Compatibility

- ✅ **100% backward compatible with v2**
- `createMediaLibrary()` works exactly as before
- `path` field is nullable - existing records work without migration
- Fallback logic for records without stored paths
- All v2 APIs unchanged

### 🚀 Migration Path

**From v2 to v3:**

- **Option 1**: Keep using `createMediaLibrary()` - zero changes needed
- **Option 2**: Upgrade to `createEnhancedMediaLibrary()` - get new features
- **Optional**: Run migration to populate `path` field for better performance

See [versions/V3_MIGRATION_GUIDE.md](versions/V3_MIGRATION_GUIDE.md) for details.

---

## [2.0.0] - Unreleased (Development Version)

### Major Refactor - v2 Architecture

Complete architectural rewrite with modularity, dependency injection, and Zod-based configuration.

See [versions/V2_MIGRATION_GUIDE.md](versions/V2_MIGRATION_GUIDE.md) for details.

---

## [1.0.0] - Unreleased (Development Version)

Initial development version with basic media library functionality.
