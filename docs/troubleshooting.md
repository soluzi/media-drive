# Troubleshooting Guide

This guide helps you resolve common issues when using Media Drive v3 in your projects.

## Common Installation Issues

### 1. Missing Peer Dependencies

**Error:** `Cannot find module '@prisma/client'`

**Solution:**

```bash
npm install @prisma/client prisma
# or
pnpm add @prisma/client prisma
# or
yarn add @prisma/client prisma
```

### 2. Prisma Schema Not Found

**Error:** `Prisma schema not found`

**Solution:**

```bash
# Initialize Prisma if not already done
npx prisma init

# Add Media model to your schema
npx media-drive migrate

# Generate Prisma client
npx prisma generate
```

### 3. TypeScript Configuration Issues

**Error:** `Module has no exported member 'createMediaLibrary'`

**Solution:**

```typescript
// ✅ Correct import
import { createMediaLibrary } from "media-drive";

// ❌ Wrong import (v1 style)
import { MediaLibrary } from "media-drive";
```

## Configuration Issues

### 1. Disk Configuration Not Found

**Error:** `Disk configuration not found for: local`

**Solution:**

```typescript
// ✅ Correct configuration
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "local",
    disks: {
      local: {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },
  },
  prisma,
});

// ❌ Missing disks configuration
const mediaLibrary = createMediaLibrary({
  config: { disk: "local" }, // Missing disks object
  prisma,
});
```

### 2. S3 Configuration Missing

**Error:** `S3 configuration not provided`

**Solution:**

```typescript
const mediaLibrary = createMediaLibrary({
  config: {
    disk: "s3",
    disks: {
      s3: {
        driver: "s3",
        key: process.env.S3_KEY,
        secret: process.env.S3_SECRET,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
      },
    },
  },
  prisma,
});
```

### 3. Environment Variables Not Loading

**Error:** Configuration values are undefined

**Solution:**

```bash
# Create .env file
MEDIA_DISK=local
MEDIA_LOG_LEVEL=info
MEDIA_MAX_FILE_SIZE=10485760

# For S3
S3_KEY=your_access_key
S3_SECRET=your_secret_key
S3_REGION=us-east-1
S3_BUCKET=your_bucket_name
```

## Runtime Issues

### 1. File Upload Failures

**Error:** `File size exceeds maximum allowed size`

**Solution:**

```typescript
// Increase file size limit
const mediaLibrary = createMediaLibrary({
  config: {
    limits: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
    },
  },
  prisma,
});
```

### 2. MIME Type Validation Errors

**Error:** `File type 'application/pdf' is not allowed`

**Solution:**

```typescript
// Allow specific MIME types
const mediaLibrary = createMediaLibrary({
  config: {
    security: {
      allowedMime: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    },
  },
  prisma,
});
```

### 3. Sharp Processing Errors

**Error:** `Sharp processing failed`

**Solution:**

```bash
# Install Sharp dependencies
npm install sharp

# For Alpine Linux (Docker)
apk add --no-cache vips-dev
```

### 4. Redis Connection Issues (BullMQ)

**Error:** `Redis connection failed`

**Solution:**

```typescript
// Check Redis configuration
const mediaLibrary = createMediaLibrary({
  config: {
    queue: {
      driver: "bullmq",
      redis: {
        host: "localhost",
        port: 6379,
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    },
  },
  prisma,
});
```

## Database Issues

### 1. Media Table Not Found

**Error:** `Table 'media' doesn't exist`

**Solution:**

```bash
# Run migrations
npx prisma migrate dev
npx prisma generate
```

### 2. Prisma Client Not Generated

**Error:** `PrismaClient is not defined`

**Solution:**

```bash
# Generate Prisma client
npx prisma generate

# Restart your application
```

## Express Integration Issues

### 1. Multer Configuration

**Error:** `req.file is undefined`

**Solution:**

```typescript
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const media = await mediaLibrary.attachFile(
    "User",
    req.body.userId,
    req.file
  );

  res.json({ media });
});
```

### 2. CORS Issues

**Error:** `CORS policy blocks request`

**Solution:**

```typescript
import cors from "cors";

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
```

## Development vs Production Issues

### 1. File Path Issues

**Error:** `ENOENT: no such file or directory`

**Solution:**

```typescript
// Ensure upload directory exists
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
```

### 2. Environment-Specific Configuration

**Solution:**

```typescript
// Use environment-specific configs
const config = {
  disk: process.env.NODE_ENV === "production" ? "s3" : "local",
  disks: {
    local: {
      driver: "local",
      root: "uploads",
      public_base_url:
        process.env.MEDIA_BASE_URL || "http://localhost:3000/uploads",
    },
    s3: {
      driver: "s3",
      key: process.env.S3_KEY,
      secret: process.env.S3_SECRET,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
    },
  },
};
```

## Debugging Tips

### 1. Enable Debug Logging

```typescript
const mediaLibrary = createMediaLibrary({
  config: {
    logging: {
      level: "debug",
    },
  },
  prisma,
});
```

### 2. Use CLI Diagnostics

```bash
# Check configuration
npx media-drive doctor

# Verify setup
npx media-drive init
```

### 3. Check Package Contents

```bash
# Verify what's included in the package
npm pack --dry-run
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs** - Enable debug logging to see detailed error messages
2. **Run diagnostics** - Use `npx media-drive doctor` to check your setup
3. **Review examples** - Check the `/docs/examples/` folder for working examples
4. **Open an issue** - Provide error messages, configuration, and environment details

## Common Error Codes

| Error                | Cause                    | Solution                           |
| -------------------- | ------------------------ | ---------------------------------- |
| `ConfigurationError` | Invalid config           | Check your configuration object    |
| `ValidationError`    | File validation failed   | Check file size and MIME type      |
| `StorageError`       | Storage operation failed | Check storage driver configuration |
| `ConversionError`    | Image processing failed  | Check Sharp installation           |
| `QueueError`         | Job queue failed         | Check Redis connection             |
| `NotFoundError`      | Resource not found       | Check if media exists              |

---

**Still having issues?** Check the [API Reference](./api-reference.md) for detailed method documentation or open an issue on GitHub.
