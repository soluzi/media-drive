# Storage Drivers

Media Drive supports multiple storage backends out of the box and allows you to create custom drivers.

## Built-in Drivers

### Local Storage

Store files on the local filesystem.

```typescript
{
  disks: {
    local: {
      driver: "local",
      root: "uploads",                        // Storage directory
      public_base_url: "http://localhost:3000/uploads",
    }
  }
}
```

**Use Cases:**

- Development
- Single-server deployments
- When you need filesystem access

**Pros:**

- Simple setup
- No external dependencies
- Fast for local access

**Cons:**

- Not suitable for multi-server deployments
- No CDN integration

---

### Amazon S3

Store files on AWS S3 or S3-compatible services.

```typescript
{
  disks: {
    s3: {
      driver: "s3",
      key: process.env.S3_KEY,
      secret: process.env.S3_SECRET,
      region: "us-east-1",
      bucket: "my-bucket",
      root: "media",              // Optional prefix
      url: "https://cdn.example.com",  // Optional CloudFront URL
      endpoint: "https://s3.example.com", // For S3-compatible services
      use_path_style_endpoint: false,
    }
  }
}
```

**S3-Compatible Services:**

- AWS S3
- DigitalOcean Spaces
- MinIO
- Wasabi
- Backblaze B2

**Features:**

- Signed URLs
- Scalable storage
- CDN integration
- Cross-region replication

---

### BunnyCDN

Store files on BunnyCDN edge storage.

```typescript
{
  disks: {
    bunnycdn: {
      driver: "bunnycdn",
      storage_zone: "my-zone",
      api_key: process.env.BUNNY_API_KEY,
      pull_zone: "my-zone.b-cdn.net",
      root: "media",       // Optional
      region: "de",        // de, ny, la, sg, syd, uk
    }
  }
}
```

**Regions:**

- `de` - Falkenstein, Germany (default)
- `ny` - New York, USA
- `la` - Los Angeles, USA
- `sg` - Singapore
- `syd` - Sydney, Australia
- `uk` - London, UK

**Features:**

- Global CDN
- Cost-effective
- Edge storage

---

## Custom Storage Driver

Implement the `StorageDriver` interface:

```typescript
import { StorageDriver, PutOptions, StoredObject } from "media-drive/core";

export class MyStorageDriver implements StorageDriver {
  async put(
    path: string,
    contents: Buffer | string,
    opts?: PutOptions
  ): Promise<StoredObject> {
    // Your implementation
    return { path, size: contents.length };
  }

  async get(path: string): Promise<Buffer> {
    // Your implementation
  }

  async delete(path: string): Promise<void> {
    // Your implementation
  }

  async exists(path: string): Promise<boolean> {
    // Your implementation
  }

  url(path: string): string {
    // Return public URL
  }

  async temporaryUrl(path: string, expiresInSec?: number): Promise<string> {
    // Return signed URL
  }
}
```

**Use your driver:**

```typescript
import { createMediaLibrary } from "media-drive";
import { MyStorageDriver } from "./my-storage";

const mediaLibrary = createMediaLibrary({
  providers: {
    storageDriver: new MyStorageDriver(),
  },
});
```

---

## Multi-Disk Setup

Use different storage for different use cases:

```typescript
const config = defineConfig({
  disk: "local", // Default

  disks: {
    local: {
      /* ... */
    },
    s3: {
      /* ... */
    },
    archive: {
      /* ... */
    },
  },
});

// Use default disk
await mediaLibrary.attachFile("User", "123", file);

// Use specific disk
await mediaLibrary.attachFile("User", "123", file, {
  disk: "archive",
});
```

---

## Best Practices

### Production Recommendations

1. **Use S3 or BunnyCDN** for production
2. **Enable CDN** for public files
3. **Set up backups** for critical media
4. **Use signed URLs** for private files
5. **Configure CORS** if serving from different domain

### Performance Tips

1. **Use CDN** for static assets
2. **Optimize images** before upload
3. **Enable caching** headers
4. **Use async conversions** for large files

### Security

1. **Validate MIME types**
2. **Set file size limits**
3. **Use signed URLs** for sensitive content
4. **Restrict bucket permissions**
5. **Enable versioning** for important files
