# Choosing Your Setup: Standard vs Enhanced

Media Drive v3 offers **two ways** to create your media library instance. This guide helps you choose the right one.

---

## 🎯 Quick Decision Guide

| Your Situation           | Use This                       | Why                                |
| ------------------------ | ------------------------------ | ---------------------------------- |
| Already using multer     | `createMediaLibrary()`         | Keep your existing upload handling |
| Want to eliminate multer | `createEnhancedMediaLibrary()` | Built-in multipart parsing         |
| Building REST API        | `createEnhancedMediaLibrary()` | Auto-generated endpoints           |
| Need custom validation   | `createEnhancedMediaLibrary()` | Built-in validation system         |
| Background jobs/CLI      | `createMediaLibrary()`         | Lighter, no HTTP dependencies      |
| Simple file storage      | `createMediaLibrary()`         | Minimal setup                      |
| Complete upload solution | `createEnhancedMediaLibrary()` | All-in-one                         |

---

## 📦 Option 1: Standard Library (`createMediaLibrary`)

### When to Use

✅ You already have multer or another upload handler  
✅ You want minimal dependencies  
✅ You're building background jobs or CLI tools  
✅ You need fine-grained control over HTTP layer  
✅ You're migrating from v2 (drop-in replacement)

### Example

```typescript
import { createMediaLibrary } from "media-drive";
import express from "express";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

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
});

// You handle the upload middleware
app.post("/upload", upload.single("file"), async (req, res) => {
  const media = await mediaLibrary.attachFile(
    "User",
    req.body.userId,
    req.file!,
    { collection: "avatar" }
  );

  res.json({ media });
});
```

### What You Get

✅ File storage (local, S3, BunnyCDN)  
✅ Image conversions (Sharp)  
✅ Queue support (BullMQ, in-memory)  
✅ Path generation strategies  
✅ File naming strategies  
✅ URL resolution  
✅ Database integration (Prisma)

### What You DON'T Get

❌ Built-in multipart parsing  
❌ Built-in validation  
❌ Auto-generated API endpoints  
❌ Upload progress tracking

---

## 🚀 Option 2: Enhanced Library (`createEnhancedMediaLibrary`)

### When to Use

✅ You want to eliminate multer dependency  
✅ You need built-in file validation  
✅ You want auto-generated REST API  
✅ You need upload progress tracking  
✅ You want an all-in-one solution  
✅ You're building a new project from scratch

### Example

```typescript
import { createEnhancedMediaLibrary, createApiRouter } from "media-drive";
import express from "express";

const mediaLibrary = createEnhancedMediaLibrary({
  config: {
    disk: "local",
    disks: {
      local: {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },

    // Enhanced features
    http: {
      enabled: true,
      multipart: {
        enabled: true,
        fileField: "file",
        limits: {
          fileSize: 10 * 1024 * 1024,
          files: 5,
        },
      },
    },

    validation: {
      fileTypes: {
        images: ["jpeg", "jpg", "png", "gif", "webp"],
        documents: ["pdf", "doc", "docx"],
        text: ["txt", "csv"],
      },
      contentValidation: true,
      maxFileSize: 10 * 1024 * 1024,
    },
  },
});

// Option A: Use built-in upload middleware (NO MULTER NEEDED!)
app.post(
  "/upload",
  mediaLibrary.uploadMiddleware(), // Handles multipart automatically
  mediaLibrary.errorHandler(), // Handles errors
  async (req, res) => {
    const result = await mediaLibrary.attachFromRequest(req, {
      modelType: "User",
      modelId: req.body.userId,
      collection: "avatar",
    });

    res.json({ media: result.media, validation: result.validation });
  }
);

// Option B: Use complete auto-generated API
const apiRouter = createApiRouter(mediaLibrary);
app.use("/api/media", apiRouter.getRouter());

// Now you automatically have:
// POST   /api/media/upload
// GET    /api/media/:id/download
// GET    /api/media/:id
// GET    /api/media (list)
// DELETE /api/media/:id
```

### What You Get

✅ **Everything from Standard +**  
✅ Built-in multipart parsing (eliminates multer)  
✅ Enhanced file validation  
✅ Content validation (magic numbers)  
✅ Upload progress tracking  
✅ Streaming support  
✅ Auto-generated REST API  
✅ Better error messages  
✅ Custom validation rules

---

## 🔄 Migration Path

### From v2 Standard → v3 Standard

```typescript
// v2
import { createMediaLibrary } from "media-drive";

const mediaLibrary = createMediaLibrary({
  config: {
    /* your config */
  },
});

// v3 - SAME CODE! Zero changes needed ✅
import { createMediaLibrary } from "media-drive";

const mediaLibrary = createMediaLibrary({
  config: {
    /* your config */
  },
});
```

### From v2 Standard → v3 Enhanced

```typescript
// Before (v2 with multer)
import { createMediaLibrary } from "media-drive";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const mediaLibrary = createMediaLibrary({ config });

app.post("/upload", upload.single("file"), async (req, res) => {
  const media = await mediaLibrary.attachFile(...);
});

// After (v3 enhanced - NO MULTER!)
import { createEnhancedMediaLibrary } from "media-drive";

const mediaLibrary = createEnhancedMediaLibrary({
  config: {
    ...yourConfig,
    http: { enabled: true, multipart: { enabled: true } },
    validation: { /* validation rules */ }
  }
});

app.post("/upload",
  mediaLibrary.uploadMiddleware(), // Built-in!
  mediaLibrary.errorHandler(),
  async (req, res) => {
    const result = await mediaLibrary.attachFromRequest(req, {
      modelType: "User",
      modelId: req.body.userId
    });
    res.json(result);
  }
);
```

---

## 📊 Feature Comparison

| Feature                | Standard        | Enhanced          |
| ---------------------- | --------------- | ----------------- |
| File storage           | ✅              | ✅                |
| Image conversions      | ✅              | ✅                |
| Queue support          | ✅              | ✅                |
| Path strategies        | ✅              | ✅                |
| File naming            | ✅              | ✅                |
| Database integration   | ✅              | ✅                |
| **Multipart parsing**  | ❌ (use multer) | ✅ Built-in       |
| **File validation**    | ❌ (DIY)        | ✅ Built-in       |
| **Content validation** | ❌              | ✅ Magic numbers  |
| **Upload progress**    | ❌              | ✅ Built-in       |
| **API endpoints**      | ❌              | ✅ Auto-generated |
| **Error handling**     | ❌ (DIY)        | ✅ Built-in       |
| **Streaming support**  | ❌              | ✅ Built-in       |
| Package size           | Smaller         | Slightly larger   |
| Complexity             | Simple          | More features     |

---

## 💡 Recommendations

### For Most Users

**Start with `createEnhancedMediaLibrary()`** if:

- Building a new project
- Want best developer experience
- Need comprehensive validation
- Building REST API

### Use `createMediaLibrary()` if:

- Already have working upload handling
- Need minimal footprint
- Building background services
- Want maximum control

---

## 🔧 Can I Switch Later?

**Yes!** Both share the same core API:

```typescript
// These methods work identically in both:
await mediaLibrary.attachFile(modelType, modelId, file, options);
await mediaLibrary.attachFromUrl(modelType, modelId, url, options);
await mediaLibrary.list(modelType, modelId, collection);
await mediaLibrary.remove(mediaId);
await mediaLibrary.resolveFileUrl(mediaId, conversion, signed);
await mediaLibrary.processConversionsAsync(mediaId, conversions);
```

**Switching is easy** - just change the factory function and add/remove HTTP config.

---

## 📝 Summary

| Question                | Answer                                                   |
| ----------------------- | -------------------------------------------------------- |
| Which should I use?     | **Enhanced** for new projects, **Standard** if migrating |
| Can I use both?         | Yes, but pick one per project                            |
| Is Standard deprecated? | No! Fully supported                                      |
| Which is better?        | Depends on your needs - both are excellent               |
| Performance difference? | Minimal - Enhanced adds HTTP features                    |

**Bottom line:** Both are actively maintained. Choose based on whether you want built-in HTTP features or prefer to handle HTTP yourself.
