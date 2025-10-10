# Configuration Guide

Media Drive v2 uses a comprehensive, type-safe configuration system built with Zod. Configuration can be provided via TypeScript files, environment variables, or programmatically.

## Configuration File

Create `media.config.ts` in your project root:

```typescript
import { defineConfig } from "media-drive";

export default defineConfig({
  disk: "local",
  disks: {
    /* ... */
  },
  limits: {
    /* ... */
  },
  // ... other options
});
```

## Configuration Options

### Disk Selection

```typescript
{
  // Default disk to use
  disk: "local",

  // Disk configurations
  disks: {
    local: { /* LocalDisk config */ },
    s3: { /* S3Disk config */ },
    bunnycdn: { /* BunnyCDNDisk config */ },
  }
}
```

### Disk Configurations

#### Local Storage

```typescript
{
  driver: "local",
  root: "uploads",
  public_base_url: "http://localhost:3000/uploads",
}
```

#### Amazon S3

```typescript
{
  driver: "s3",
  key: process.env.S3_KEY,
  secret: process.env.S3_SECRET,
  region: "us-east-1",
  bucket: "my-bucket",
  root: "media",              // optional prefix
  url: "https://cdn.example.com",  // optional custom URL
  endpoint: "https://s3.example.com", // optional for S3-compatible services
  use_path_style_endpoint: false,
}
```

#### BunnyCDN

```typescript
{
  driver: "bunnycdn",
  storage_zone: "my-zone",
  api_key: process.env.BUNNY_API_KEY,
  pull_zone: "my-zone.b-cdn.net",
  root: "media",       // optional
  region: "de",        // optional, default: "de"
}
```

### File Limits

```typescript
{
  limits: {
    maxFileSize: 10 * 1024 * 1024,  // 10MB in bytes
  }
}
```

### Security

```typescript
{
  security: {
    // Allowed MIME types (empty = allow all)
    allowedMime: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],

    // Forbidden MIME types (checked first)
    forbiddenMime: [
      "application/x-executable",
    ],
  }
}
```

### URL Configuration

```typescript
{
  urls: {
    prefix: "",                    // URL prefix
    version: true,                 // Add version param to URLs
    signedDefault: false,          // Use signed URLs by default
    temporaryUrlExpiry: 3600,      // Expiry in seconds (1 hour)
  }
}
```

### Image Conversions

```typescript
{
  conversions: {
    progressive: true,       // Progressive JPEG/PNG
    defaultQuality: 85,      // Quality (1-100)
    stripMetadata: true,     // Remove EXIF data
  }
}
```

### Responsive Images

```typescript
{
  responsiveImages: {
    enabled: true,
    widths: [640, 768, 1024, 1366, 1600, 1920],
  }
}
```

### Queue Configuration

```typescript
{
  queue: {
    driver: "bullmq",        // "bullmq" | "in-memory"
    name: "media-conversions",

    redis: {
      host: "localhost",
      port: 6379,
      password: undefined,
      db: 0,
    },
  }
}
```

### File Naming

```typescript
{
  fileNaming: {
    strategy: "random",  // "random" | "original" | "uuid"
  }
}
```

Strategies:

- **random**: `abc123def456.jpg`
- **original**: `my-photo.jpg` (sanitized)
- **uuid**: `550e8400-e29b-41d4-a716-446655440000.jpg`

### Path Generation

```typescript
{
  pathGeneration: {
    strategy: "default",  // "default" | "date-based" | "flat" | "simple"
  }
}
```

Strategies:

- **default**: `User/123/avatar/abc123.jpg` (hierarchical structure)
- **simple**: `550e8400-e29b-41d4-a716-446655440000/abc123.jpg` (UUID-based, flat structure)
- **date-based**: `User/2024/01/15/abc123.jpg` (organized by date)
- **flat**: `abc123.jpg` (all files in root)

#### Simple Path Strategy

The `simple` strategy uses a UUID as the mediaId and stores files in the format `mediaId/fileName`:

```typescript
const config = defineConfig({
  pathGeneration: {
    strategy: "simple" as const,
  },
});
```

**Benefits:**

- Clean, flat structure with no nested directories
- UUID-based uniqueness ensures no conflicts
- Easy CDN integration and caching
- Simple URL structure for frontend consumption
- Predictable path format

### Logging

```typescript
{
  logging: {
    level: "info",  // "debug" | "info" | "warn" | "error"
  }
}
```

### Media Downloader

```typescript
{
  mediaDownloader: {
    timeout: 30000,           // 30 seconds
    maxRedirects: 5,
    maxFileSize: 10 * 1024 * 1024,  // 10MB
  }
}
```

## Environment Variables

Media Drive automatically loads configuration from environment variables:

```bash
# Disk selection
MEDIA_DISK=s3

# Logging
MEDIA_LOG_LEVEL=debug

# Limits
MEDIA_MAX_FILE_SIZE=10485760

# S3 Configuration
S3_KEY=your-key
S3_SECRET=your-secret
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ROOT=media
S3_URL=https://cdn.example.com
S3_ENDPOINT=https://s3.example.com
S3_USE_PATH_STYLE=true

# BunnyCDN Configuration
BUNNY_STORAGE_ZONE=my-zone
BUNNY_API_KEY=your-api-key
BUNNY_PULL_ZONE=my-zone.b-cdn.net
BUNNY_ROOT=media
BUNNY_REGION=de

# Redis/Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DB=0
QUEUE_NAME=media-conversions
```

## Programmatic Configuration

```typescript
import { createMediaLibrary, defineConfig } from "media-drive";

const config = defineConfig({
  disk: "s3",
  disks: {
    s3: {
      driver: "s3",
      key: "...",
      secret: "...",
      region: "us-east-1",
      bucket: "my-bucket",
    },
  },
});

const mediaLibrary = createMediaLibrary({ config });
```

## Provider Overrides

For advanced use cases, you can inject custom implementations:

```typescript
import { createMediaLibrary } from "media-drive";
import { MyCustomStorageDriver } from "./my-storage";

const mediaLibrary = createMediaLibrary({
  providers: {
    storageDriver: new MyCustomStorageDriver(),
    // conversionProcessor: custom processor,
    // queueDriver: custom queue,
    // pathGenerator: custom path generator,
    // fileNamer: custom file namer,
  },
});
```

## Configuration Validation

Media Drive validates configuration at runtime using Zod. Invalid configurations will throw descriptive errors:

```typescript
try {
  const mediaLibrary = createMediaLibrary({ config });
} catch (error) {
  console.error("Configuration error:", error.message);
}
```
