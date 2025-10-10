# Migration Guide: v2.x → v3.0

## Overview

Media Drive v3.0 introduces **stored file paths** to support non-deterministic path generators (e.g., UUID-based paths, random paths). This change ensures that file URLs remain consistent regardless of the path generation strategy used.

## Breaking Changes

### Path Storage

**What Changed:**
- File paths are now stored in the database alongside other media metadata
- The `path` field has been added to the `Media` model in Prisma schema
- `resolveFileUrl()` and `remove()` methods now use the stored path instead of regenerating it

**Why:**
- Supports non-deterministic path generators (UUID-based, random, etc.)
- Ensures consistent URLs even if path generation logic changes
- Improves performance by eliminating path regeneration
- More reliable - always returns the actual file location

**Impact:**
- Existing media records without a stored path will use a fallback mechanism
- New uploads will automatically store the path
- You should run the migration utility to update existing records

## Migration Steps

### 1. Update Dependencies

```bash
npm install media-drive@^3.0.0
# or
pnpm add media-drive@^3.0.0
# or
yarn add media-drive@^3.0.0
```

### 2. Update Prisma Schema

Add the `path` field to your Media model:

```prisma
model Media {
  id                String   @id @default(cuid())
  path              String   // ← Add this field
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
  @@index([path]) // ← Add this index for performance
  @@map("media")
}
```

### 3. Create and Run Migration

```bash
# Create migration
npx prisma migrate dev --name add_media_path_field

# Or for production
npx prisma migrate deploy
```

### 4. Migrate Existing Records

Run the migration utility to populate paths for existing media records:

```typescript
import { PrismaClient } from "@prisma/client";
import { migrateMediaPaths, checkMigrationStatus } from "media-drive/migration";
import { DefaultPathGenerator } from "media-drive/strategies";

const prisma = new PrismaClient();

// Check status first
const status = await checkMigrationStatus(prisma);
console.log(`Migration status: ${status.withPath}/${status.total} records have paths (${status.percentage.toFixed(1)}%)`);

if (status.withoutPath > 0) {
  console.log(`${status.withoutPath} records need migration`);
  
  // Run migration (use your path generator)
  const result = await migrateMediaPaths(
    prisma,
    new DefaultPathGenerator(), // Use the SAME path generator your app uses
    {
      dryRun: true, // Test first!
      batchSize: 100,
      continueOnError: true,
    }
  );
  
  console.log(`Migrated: ${result.migrated}/${result.total}`);
  console.log(`Failed: ${result.failed}`);
  
  // If dry run looks good, run for real
  if (result.failed === 0) {
    await migrateMediaPaths(prisma, new DefaultPathGenerator(), {
      dryRun: false,
    });
  }
}

await prisma.$disconnect();
```

### 5. Verify Migration

```typescript
import { checkMigrationStatus } from "media-drive/migration";

const status = await checkMigrationStatus(prisma);
console.log(`Migration complete: ${status.percentage.toFixed(1)}% of records have paths`);

if (status.withoutPath > 0) {
  console.warn(`Warning: ${status.withoutPath} records still need migration`);
}
```

## Important Notes

### Backward Compatibility

The package includes fallback logic for existing records:

- **New uploads**: Automatically store the path ✅
- **Existing records with path**: Use stored path ✅
- **Existing records without path**: Regenerate path with warning ⚠️

The fallback mechanism ensures your app keeps working, but you should migrate existing records as soon as possible.

### Path Generator Requirements

**IMPORTANT:** Use the **same path generator** during migration that your application uses:

```typescript
// If your app uses DefaultPathGenerator
const result = await migrateMediaPaths(prisma, new DefaultPathGenerator());

// If your app uses SimplePathGenerator
const result = await migrateMediaPaths(prisma, new SimplePathGenerator());

// If your app uses a custom generator
const result = await migrateMediaPaths(prisma, new YourCustomPathGenerator());
```

### Non-Deterministic Generators

If you're using a non-deterministic path generator (e.g., UUID-based):

1. **Migration won't work** for existing records (paths can't be recreated)
2. **Solution**: Keep using the old generator for migration, then switch to the new one
3. **Or**: Accept that old records use the old path format and new records use the new format

Example:

```typescript
// Option 1: Migrate with old generator, then switch
await migrateMediaPaths(prisma, new DefaultPathGenerator());
// Now you can switch your app to use SimplePathGenerator

// Option 2: Mixed paths (not recommended, but works)
// Old records: User/123/avatar/file.jpg
// New records: 550e8400-e29b-41d4-a716-446655440000/file.jpg
```

## CLI Migration Tool

For convenience, you can use the CLI:

```bash
# Check migration status
npx media-drive migrate:check

# Run migration (interactive)
npx media-drive migrate:run

# Run migration (non-interactive)
npx media-drive migrate:run --strategy default --batch-size 100
```

## Rollback

If you need to rollback:

```bash
# Remove the path field
npx prisma migrate dev --name remove_media_path_field

# Or manually
ALTER TABLE "media" DROP COLUMN "path";
DROP INDEX IF EXISTS "media_path_idx";
```

Then downgrade the package:

```bash
npm install media-drive@^2.0.0
```

## Troubleshooting

### Migration Fails for Some Records

**Problem:** Some records fail during migration

**Solutions:**
1. Check if the files still exist on disk
2. Verify your path generator configuration matches the original
3. Use `continueOnError: true` to skip failed records
4. Manually fix failed records

### Path Mismatch

**Problem:** Stored path doesn't match actual file location

**Solutions:**
1. Regenerate the path using the migration utility
2. Check if the path generator configuration changed
3. Verify the disk configuration is correct

### Performance Issues

**Problem:** Migration takes too long

**Solutions:**
1. Reduce batch size: `batchSize: 50`
2. Run during off-peak hours
3. Add indexes before migration
4. Consider running in background job

## Need Help?

- 📚 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 📧 [Email Support](mailto:support@example.com)

## Summary

| Step | Required | Time | Risk |
|------|----------|------|------|
| Update dependencies | ✅ Yes | 1 min | Low |
| Update Prisma schema | ✅ Yes | 2 min | Low |
| Run migration | ✅ Yes | 1 min | Low |
| Migrate existing records | ⚠️ Recommended | 5-60 min | Medium |
| Verify migration | ✅ Yes | 1 min | Low |

**Total estimated time:** 10-65 minutes (depending on number of records)

---

**Ready to upgrade?** Follow the steps above and you'll be running v3.0 in no time! 🚀

