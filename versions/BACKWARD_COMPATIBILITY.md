# Backward Compatibility Guide

## Can I use v3 without migrating?

**Yes! Absolutely.** Media Drive v3 is **100% backward compatible** with v2. You can upgrade to v3 and continue using it exactly as you did with v2, without running any migration.

---

## ✅ What Works Without Migration

### 1. **Existing Records (v2 format)**

```typescript
// v2 users: Records without path field
const media = await prisma.media.findMany();
// ✅ Works! Returns all records, even those without path field

const url = await mediaLibrary.resolveFileUrl(mediaId);
// ✅ Works! Uses fallback mechanism to regenerate path
```

### 2. **New Uploads**

```typescript
// New uploads automatically store path
const media = await mediaLibrary.attachFile("User", "123", file);
// ✅ Works! Path stored in database automatically
```

### 3. **All Public API Methods**

```typescript
// All methods work exactly as in v2
await mediaLibrary.attachFile(modelType, modelId, file, options);
await mediaLibrary.attachFromUrl(modelType, modelId, url, options);
await mediaLibrary.list(modelType, modelId, collection);
await mediaLibrary.remove(mediaId);
await mediaLibrary.resolveFileUrl(mediaId, conversion, signed);
// ✅ All work without migration!
```

---

## 🔧 Fallback Mechanism

When you access a record without a stored path, v3 automatically regenerates it:

```typescript
// Old record (no path field)
const url = await mediaLibrary.resolveFileUrl(oldMediaId);

// Behind the scenes:
// 1. Checks for stored path
// 2. If not found, regenerates using path generator
// 3. Logs a warning (in debug mode)
// 4. Returns the URL
// ✅ Everything works!
```

**Limitations of Fallback:**

- Only works with **deterministic path generators** (default, date-based, flat)
- Logs warnings recommending migration
- Slightly slower (regeneration overhead)
- May fail with **non-deterministic generators** (simple/UUID-based, random)

---

## 🎯 When Do You NEED to Migrate?

You **only need to migrate** if you want to use:

### ❌ **Non-Deterministic Path Generators**

```typescript
// This REQUIRES migration for old records
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "simple" }, // UUID-based
  },
});

// Old records: ⚠️ Path can't be regenerated (UUID was random)
// New records: ✅ Work perfectly
```

### ✅ **Deterministic Path Generators (No Migration Needed)**

```typescript
// These work fine WITHOUT migration
const service = createMediaLibrary({
  config: {
    pathGeneration: { strategy: "default" }, // ✅ Works
    // or "date-based" ✅ Works
    // or "flat" ✅ Works
  },
});

// Old records: ✅ Path regenerated successfully
// New records: ✅ Path stored in database
```

---

## 📋 Migration Decision Matrix

| Your Situation | Need Migration? | What Happens |
|----------------|-----------------|--------------|
| Using default path generator | ❌ No | Everything works via fallback |
| Using date-based path generator | ❌ No | Everything works via fallback |
| Using flat path generator | ❌ No | Everything works via fallback |
| Want to use simple (UUID) paths | ✅ Yes | Old records can't regenerate |
| Want to use custom random paths | ✅ Yes | Old records can't regenerate |
| Want best performance | ⚠️ Recommended | Eliminates regeneration overhead |
| Want to future-proof | ⚠️ Recommended | Allows switching generators later |

---

## 🚀 Using v3 Without Migration

### Scenario: Default Path Generator

```typescript
// Your v2 code
const service = createMediaLibrary({
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
});

// After upgrading to v3
// 1. Install: npm install media-drive@^3.0.0
// 2. Add migration (optional - for future proofing):
//    npx prisma migrate dev --name add_media_path_field_optional
// 3. That's it! Everything works.

// Old records: Paths regenerated automatically
// New uploads: Paths stored automatically
// ✅ Zero downtime, zero code changes
```

---

## ⚙️ Gradual Migration Strategy

You can upgrade and migrate gradually:

### Phase 1: Upgrade to v3 (No Migration)

```bash
npm install media-drive@^3.0.0
npx prisma migrate dev --name add_media_path_field_optional
```

**Status:**
- Old records: Use fallback (regenerate path)
- New uploads: Store path
- Everything works!

### Phase 2: Migrate When Ready

```typescript
// Run migration whenever convenient
import { migrateMediaPaths } from "media-drive/migration";

await migrateMediaPaths(prisma, pathGenerator, {
  dryRun: true, // Test first
});

// Check results, then run for real
await migrateMediaPaths(prisma, pathGenerator);
```

**Status:**
- All records: Use stored path
- No more fallback warnings
- Better performance

---

## 🛡️ Zero Downtime Upgrade

```bash
# Step 1: Update package
npm install media-drive@^3.0.0

# Step 2: Add optional path field to schema
# In prisma/schema.prisma:
# path String? // Optional!

# Step 3: Run migration
npx prisma migrate deploy

# Step 4: Deploy your app
# ✅ App continues working immediately

# Step 5: Migrate records at your convenience
# Can be done days/weeks later
npx ts-node migrate-media-paths.ts
```

---

## 📊 Performance Impact

### With Migration

| Operation | v2 | v3 (Migrated) |
|-----------|-----|---------------|
| Upload | Fast | Fast |
| Resolve URL | Slow (regenerate) | ✅ Fast (stored) |
| Delete | Slow (regenerate) | ✅ Fast (stored) |
| List | Fast | Fast |

### Without Migration

| Operation | v2 | v3 (Not Migrated) |
|-----------|-----|-------------------|
| Upload | Fast | Fast |
| Resolve URL (old records) | Slow | Slow (fallback) |
| Resolve URL (new records) | Slow | ✅ Fast (stored) |
| Delete (old records) | Slow | Slow (fallback) |
| Delete (new records) | Slow | ✅ Fast (stored) |

**Conclusion:** Migration improves performance, but isn't required for basic operation.

---

## 🔍 How to Check If You Need Migration

```typescript
import { checkMigrationStatus } from "media-drive/migration";

const status = await checkMigrationStatus(prisma);

console.log(`Total records: ${status.total}`);
console.log(`With stored paths: ${status.withPath} (${status.percentage.toFixed(1)}%)`);
console.log(`Without stored paths: ${status.withoutPath}`);

if (status.withoutPath === 0) {
  console.log("✅ No migration needed!");
} else if (status.percentage > 50) {
  console.log("⚠️ Most records already migrated");
} else {
  console.log("💡 Consider running migration for better performance");
}
```

---

## 💡 Recommendations

### For v2 Users Upgrading to v3

**Minimum (Zero Downtime):**
1. ✅ Install v3: `npm install media-drive@^3.0.0`
2. ✅ Add optional path field to Prisma schema
3. ✅ Run migration: `npx prisma migrate deploy`
4. ✅ Deploy and monitor

**Optimal (Best Performance):**
1. ✅ Follow minimum steps above
2. ✅ Run migration utility during off-peak hours
3. ✅ Verify migration completed successfully
4. ✅ Enjoy improved performance on all records

### For New Projects

Just use v3 from the start:
```prisma
path String? // Optional initially
```

All uploads will store paths automatically. Make it required later:
```prisma
path String // Required after confirming all uploads work
```

---

## 🎊 Summary

| Question | Answer |
|----------|--------|
| Can I use v3 without migrating? | ✅ Yes! Fully backward compatible |
| Will existing records work? | ✅ Yes! Via fallback mechanism |
| Will new uploads work? | ✅ Yes! Paths stored automatically |
| Do I need to change code? | ❌ No! Same API as v2 |
| When should I migrate? | When using non-deterministic generators or for better performance |
| Is migration risky? | ❌ No! Includes dry-run mode and error handling |
| Can I rollback? | ✅ Yes! Downgrade to v2 anytime |

**Bottom Line:** v3 is safe to upgrade to. Migration is optional but recommended for optimal performance and future flexibility.

**Upgrade with confidence!** 🚀

