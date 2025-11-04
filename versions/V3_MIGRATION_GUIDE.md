# Media Drive v3 - Migration & Feature Guide

## 🎉 What's New in v3

Media Drive v3 introduces **stored file paths** to support non-deterministic path generators, ensuring consistent URLs regardless of your path generation strategy.

---

## ✨ Major Improvement

### **Stored File Paths**

**Before (v2):**

```typescript
// Path regenerated on every URL resolution
// ❌ Fails with non-deterministic generators (UUID, random)
const url = await mediaLibrary.resolveFileUrl(mediaId);
// Path regenerated: might be different each time!
```

**After (v3):**

```typescript
// Path stored in database during upload
// ✅ Works with ANY path generator
const url = await mediaLibrary.resolveFileUrl(mediaId);
// Uses stored path: always consistent!
```

**Benefits:**

- ✅ Supports non-deterministic path generators (UUID-based, random, etc.)
- ✅ Better performance (no path regeneration overhead)
- ✅ Always returns actual file location
- ✅ Consistent URLs even if path generator logic changes
- ✅ Backward compatible with fallback mechanism

---

## 🔧 Technical Details

### Database Schema Update

A new `path` field has been added to the Media model:

```prisma
model Media {
  id                String   @id @default(cuid())
  path              String?  // ← NEW: Stores generated file path (optional for backward compatibility)
  model_type        String
  model_id          String
  collection_name   String   @default("default")
  name              String
  file_name         String
  mime_type         String
  disk              String   @default("local")
  size              Int
  manipulations     Json?
  custom_properties Json?
  responsive_images Json?
  order_column      Int?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@index([model_type, model_id])
  @@index([model_type, model_id, collection_name])
  @@index([disk])
  @@index([path]) // ← NEW: Index for performance
  @@map("media")
}
```

### How It Works

**Upload (automatic):**

```typescript
const media = await mediaLibrary.attachFile("User", "123", file, {
  pathGeneration: { strategy: "simple" }, // UUID-based
});

// Path stored: 550e8400-e29b-41d4-a716-446655440000/profile.jpg
// ✅ Saved to database automatically
```

**URL Resolution (uses stored path):**

```typescript
const url = await mediaLibrary.resolveFileUrl(media.id);
// ✅ Uses stored path from database
// No regeneration needed!
```

**Fallback for Legacy Records:**

```typescript
// For records without stored paths
const url = await mediaLibrary.resolveFileUrl(oldMediaId);
// ⚠️ Attempts to regenerate path (may fail with non-deterministic generators)
// 📢 Warning logged: recommending migration
```

---

## 🔄 Migration Guide

### Step 1: Update Dependencies

```bash
npm install media-drive@^3.0.0
```

### Step 2: Update Prisma Schema

Add the `path` field to your Media model (see schema above).

### Step 3: Create Migration

```bash
# Development
npx prisma migrate dev --name add_media_path_field

# Production
npx prisma migrate deploy
```

### Step 4: Migrate Existing Records

Use the built-in migration utility:

```typescript
import { migrateMediaPaths, checkMigrationStatus } from "media-drive";
import { DefaultPathGenerator } from "media-drive";

// 1. Check status
const status = await checkMigrationStatus(prisma);
console.log(`${status.withPath}/${status.total} records have paths`);

// 2. Run migration with dry run
const result = await migrateMediaPaths(
  prisma,
  new DefaultPathGenerator(), // ⚠️ Use YOUR path generator!
  {
    dryRun: true,
    batchSize: 100,
    continueOnError: true,
  }
);

console.log(`Would migrate: ${result.migrated}/${result.total}`);

// 3. Run for real if dry run succeeded
if (result.failed === 0) {
  await migrateMediaPaths(prisma, new DefaultPathGenerator(), {
    dryRun: false,
  });
}
```

### Step 5: Verify

```typescript
const status = await checkMigrationStatus(prisma);
if (status.percentage === 100) {
  console.log("✅ Migration complete!");
} else {
  console.warn(`⚠️ ${status.withoutPath} records still need migration`);
}
```

**That's it!** All new uploads will automatically store paths.

---

## 🚨 Breaking Changes

**None!** All public API methods remain identical:

- `attachFile(modelType, modelId, file, options)`
- `attachFromUrl(modelType, modelId, url, options)`
- `list(modelType, modelId, collection?)`
- `remove(mediaId)`
- `resolveFileUrl(mediaId, conversion?, signed?)`
- `processConversionsAsync(mediaId, conversions)`
- `getConversionJobStatus(jobId)`
- `getQueueStats()`

The only change is **internal**: paths are now stored instead of regenerated.

---

## 🎯 Why Upgrade to v3?

| Feature                           | v2                  | v3                         |
| --------------------------------- | ------------------- | -------------------------- |
| **Deterministic Path Generators** | ✅                  | ✅                         |
| **Non-Deterministic Generators**  | ❌ Fails on resolve | ✅ Fully supported         |
| **UUID-Based Paths**              | ❌                  | ✅                         |
| **Random Paths**                  | ❌                  | ✅                         |
| **Performance**                   | Path regeneration   | ✅ No regeneration         |
| **URL Consistency**               | May change          | ✅ Always consistent       |
| **Custom Path Generators**        | Limited support     | ✅ Full support (any type) |
| **Migration Utility**             | ❌                  | ✅ Automated               |
| **Backward Compatibility**        | N/A                 | ✅ Fallback mechanism      |

---

## 🚀 New Capabilities

### 1. **UUID-Based Paths (SimplePathGenerator)**

```typescript
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "simple" },
  },
});

// Uploads create paths like:
// 550e8400-e29b-41d4-a716-446655440000/profile.jpg
// 6ba7b810-9dad-11d1-80b4-00c04fd430c8/banner.png

// ✅ Works perfectly - path stored in database!
```

### 2. **Custom Non-Deterministic Generators**

```typescript
import { PathGenerator } from "media-drive";

class HashBasedPathGenerator implements PathGenerator {
  generate(ctx) {
    const hash = crypto.randomBytes(16).toString("hex");
    return {
      path: `${hash}/${ctx.fileName}`,
      directory: hash,
      fileName: ctx.fileName,
    };
  }

  generateConversion(ctx, name) {
    // Conversion logic
  }
}

// Now works with v3! (failed in v2)
import { createMediaLibrary } from "media-drive";

const service = createMediaLibrary({
  providers: {
    pathGenerator: new HashBasedPathGenerator(),
  },
});
```

### 3. **Migration Utility Features**

```typescript
// Check migration status
const status = await checkMigrationStatus(prisma);
console.log(`Progress: ${status.percentage.toFixed(1)}%`);

// Batch processing
await migrateMediaPaths(prisma, generator, {
  batchSize: 50, // Process 50 at a time
  continueOnError: true, // Don't stop on errors
  dryRun: true, // Test first
});

// Error reporting
const result = await migrateMediaPaths(prisma, generator);
if (result.failed > 0) {
  console.log("Failed records:");
  result.errors.forEach(({ mediaId, error }) => {
    console.log(`  - ${mediaId}: ${error}`);
  });
}
```

---

## ⚙️ Migration Utility API

### `migrateMediaPaths(prisma, pathGenerator, options)`

Migrates existing media records to store paths.

**Parameters:**

- `prisma: PrismaClient` - Your Prisma client instance
- `pathGenerator: PathGenerator` - The path generator to use (must match your app's generator)
- `options?: MigrationOptions` - Migration options

**Options:**

```typescript
{
  batchSize?: number;        // Records per batch (default: 100)
  continueOnError?: boolean; // Skip failed records (default: true)
  dryRun?: boolean;          // Test mode, no updates (default: false)
}
```

**Returns:** `MigrationResult`

```typescript
{
  total: number; // Total records processed
  migrated: number; // Successfully migrated
  failed: number; // Failed migrations
  skipped: number; // Already had paths
  errors: Array<{
    // Error details
    mediaId: string;
    error: string;
  }>;
}
```

### `checkMigrationStatus(prisma)`

Checks how many records need migration.

**Returns:**

```typescript
{
  total: number; // Total media records
  withPath: number; // Records with paths
  withoutPath: number; // Records needing migration
  percentage: number; // % complete (0-100)
}
```

---

## 🛠️ CLI Tools

> **Note:** CLI migration commands are not yet implemented. Use the migration utilities programmatically (see Step 4 above).

The CLI currently provides:

```bash
# Print Prisma schema and migration instructions
npx media-drive migrate

# Check environment and dependencies
npx media-drive doctor

# Generate configuration file
npx media-drive init
```

---

## ⚠️ Important Notes

### Path Generator Consistency

**CRITICAL:** Use the **same path generator** during migration that your app uses:

```typescript
import {
  createMediaLibrary,
  DefaultPathGenerator,
  migrateMediaPaths,
} from "media-drive";

// ✅ Correct: Using DefaultPathGenerator
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "default" },
  },
});

// Migration must use DefaultPathGenerator too
await migrateMediaPaths(prisma, new DefaultPathGenerator());
```

```typescript
import {
  createMediaLibrary,
  DefaultPathGenerator,
  migrateMediaPaths,
} from "media-drive";

// ❌ Wrong: Mismatch will create incorrect paths!
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "simple" }, // SimplePathGenerator
  },
});

// Migration uses different generator!
await migrateMediaPaths(prisma, new DefaultPathGenerator()); // ❌
```

### Non-Deterministic Generators

If switching from deterministic to non-deterministic:

**Option 1: Migrate first, then switch**

```typescript
import {
  migrateMediaPaths,
  DefaultPathGenerator,
  createMediaLibrary,
} from "media-drive";

// 1. Migrate with old generator
await migrateMediaPaths(prisma, new DefaultPathGenerator());

// 2. Now switch to new generator
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "simple" }, // UUID-based
  },
});

// Old records: User/123/avatar/file.jpg
// New records: 550e8400-e29b-41d4-a716-446655440000/file.jpg
```

**Option 2: Accept mixed paths**

```typescript
import { createMediaLibrary } from "media-drive";

// Just switch - old records use fallback
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "simple" },
  },
});

// Old records will attempt regeneration (may log warnings)
// New records work perfectly
```

---

## 🔙 Rollback

If you need to rollback to v2:

```bash
# 1. Downgrade package
npm install media-drive@^2.0.0

# 2. Remove path field (optional)
npx prisma migrate dev --name remove_media_path_field

# Or manually:
# ALTER TABLE "media" DROP COLUMN "path";
# DROP INDEX IF EXISTS "media_path_idx";
```

---

## 🐛 Troubleshooting

### Migration Fails for Some Records

**Problem:** Some records fail during migration

**Solutions:**

1. Check if files still exist on disk
2. Verify path generator matches original configuration
3. Use `continueOnError: true` to skip failed records
4. Manually fix failed records using error report

### Path Mismatch

**Problem:** Stored path doesn't match actual file location

**Solutions:**

1. Verify path generator configuration
2. Re-run migration with correct generator
3. Check disk configuration is correct

### Performance Issues

**Problem:** Migration takes too long

**Solutions:**

1. Reduce batch size: `batchSize: 50`
2. Run during off-peak hours
3. Consider background job processing

---

## 📖 Resources

- **[V2 Migration Guide](./V2_MIGRATION_GUIDE.md)** - If upgrading from v1
- **[Architecture Overview](./ARCHITECTURE.md)** - Deep dive into design
- **[API Reference](./docs/api-reference.md)** - Complete API docs
- **[Advanced Usage](./docs/advanced.md)** - Custom implementations
- **[Storage Guide](./docs/storage.md)** - Storage driver details

---

## 🎊 Summary

Media Drive v3 solves the path generation problem with:

✅ **Universal support** - Works with ANY path generator  
✅ **Zero breaking changes** - Upgrade risk-free  
✅ **Better performance** - No regeneration overhead  
✅ **Always reliable** - Uses actual stored paths  
✅ **Easy migration** - Automated utility with progress tracking  
✅ **Backward compatible** - Fallback for legacy records

**Upgrade today and unlock support for non-deterministic path generators!** 🚀
