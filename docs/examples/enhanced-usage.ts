/**
 * Enhanced Media Drive Usage Examples
 *
 * This file demonstrates the new enhanced features including:
 * - Built-in HTTP multipart parsing
 * - Enhanced file validation
 * - Upload progress tracking
 * - Built-in API endpoints
 * - Better error handling
 */

import express from "express";
import {
  createEnhancedMediaLibrary,
  createApiRouter,
  defineConfig,
} from "media-drive";

// ==================== Basic Enhanced Setup ====================

const app = express();

// Create enhanced media library with built-in HTTP support
const mediaLibrary = createEnhancedMediaLibrary({
  config: defineConfig({
    // Basic config
    disk: "local",
    disks: {
      local: {
        driver: "local",
        root: "./uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    },

    // Enhanced HTTP features
    http: {
      enabled: true,
      multipart: {
        enabled: true,
        fileField: "file",
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          files: 5,
          fields: 10,
          fieldSize: 1024,
          fieldNameSize: 256,
          parts: 10,
        },
        storage: "memory",
        preservePath: false,
      },
    },

    // Enhanced validation
    validation: {
      fileTypes: {
        images: ["jpeg", "jpg", "png", "gif", "webp", "svg"],
        documents: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
        text: ["txt", "csv"],
        audio: [],
        video: [],
        archives: ["zip"],
      },
      contentValidation: true,
      virusScanning: false,
      maxFileSize: 10 * 1024 * 1024,
      customValidators: [],
    },

    // Upload features
    upload: {
      streaming: false,
      progress: true,
      chunked: false,
      tempStorage: false,
    },

    // Error handling
    errorHandling: {
      detailed: true,
      validation: {
        onInvalidType: "File type not supported",
        onSizeExceeded: "File too large",
        onVirusDetected: "File contains malware",
      },
      retry: {
        maxAttempts: 3,
        backoff: "exponential",
      },
    },
  }),
});

// ==================== Method 1: Simple Upload Middleware ====================

// Basic upload route with built-in multipart parsing
app.post(
  "/upload",
  mediaLibrary.uploadMiddleware(),
  mediaLibrary.errorHandler(),
  async (req, res) => {
    try {
      const result = await mediaLibrary.attachFromRequest(req, {
        modelType: req.body.modelType,
        modelId: req.body.modelId,
        collection: req.body.collection || "default",
      });

      res.json({
        success: true,
        data: result.media,
        validation: result.validation,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
);

// ==================== Method 2: Upload with Progress Tracking ====================

// Upload route with progress tracking
app.post(
  "/upload/progress",
  mediaLibrary.uploadWithProgress(),
  mediaLibrary.errorHandler(),
  async (req, res) => {
    try {
      const result = await mediaLibrary.attachFromRequest(req, {
        modelType: req.body.modelType,
        modelId: req.body.modelId,
        collection: req.body.collection || "default",
      });

      // Get upload progress info
      const progress = mediaLibrary.getUploadProgress(req);

      res.json({
        success: true,
        data: result.media,
        validation: result.validation,
        progress,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
);

// ==================== Method 3: Built-in API Router ====================

// Create API router with built-in endpoints
const apiRouter = createApiRouter(mediaLibrary, {
  basePath: "/api/media",
  endpoints: {
    upload: "/upload",
    download: "/:id/download",
    delete: "/:id",
    list: "/",
    info: "/:id",
  },
  cors: true,
});

// Mount the API router
app.use("/api/media", apiRouter.getRouter());

// ==================== Method 4: Custom Validation Rules ====================

// Add custom validation rules
mediaLibrary.addValidationRule({
  name: "maxImageDimensions",
  validator: async (file) => {
    if (file.mimetype.startsWith("image/")) {
      // This would use sharp to check dimensions
      // For demo purposes, just return true
      return true;
    }
    return true;
  },
  errorMessage: "Image dimensions exceed maximum allowed size",
});

// Add file size validation for specific types
mediaLibrary.addValidationRule({
  name: "documentSizeLimit",
  validator: (file) => {
    if (file.mimetype === "application/pdf") {
      return file.size <= 5 * 1024 * 1024; // 5MB for PDFs
    }
    return true;
  },
  errorMessage: "PDF files must be smaller than 5MB",
});

// ==================== Method 5: Configuration Updates ====================

// Update validation configuration at runtime
mediaLibrary.updateValidationConfig({
  maxFileSize: 5 * 1024 * 1024, // Reduce to 5MB
  fileTypes: {
    images: ["jpeg", "jpg", "png"], // Only allow basic image formats
    documents: ["pdf"],
    text: ["txt"],
    audio: [],
    video: [],
    archives: [],
  },
});

// Update multipart configuration
mediaLibrary.updateMultipartConfig({
  limits: {
    fileSize: 5 * 1024 * 1024, // Match validation config
    files: 3, // Reduce max files
  },
});

// ==================== Method 6: Error Handling ====================

// Global error handler for media-related errors
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error.message && error.message.includes("File validation failed")) {
      return res.status(400).json({
        error: "File validation failed",
        details: error.message,
        code: "VALIDATION_ERROR",
      });
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        message: "File size exceeds maximum allowed size",
        code: "FILE_TOO_LARGE",
      });
    }

    next(error);
  }
);

// ==================== Method 7: Complete Express Integration ====================

// Alternative: Use complete upload route handler
app.post("/complete-upload", ...mediaLibrary.createUploadRoute());

// Alternative: Use upload route with progress
app.post(
  "/upload-with-progress",
  ...mediaLibrary.createUploadRouteWithProgress()
);

// Alternative: Use streaming upload
app.post("/streaming-upload", ...mediaLibrary.createStreamingUploadRoute());

// ==================== Method 8: Frontend Integration Example ====================

// Example frontend code (this would be in your frontend)
/*
// HTML
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" name="file" id="fileInput" />
  <input type="hidden" name="modelType" value="Task" />
  <input type="hidden" name="modelId" value="task-123" />
  <input type="hidden" name="collection" value="documents" />
  <button type="submit">Upload</button>
</form>

<div id="progress"></div>

// JavaScript
const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const progress = document.getElementById('progress');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  
  try {
    const response = await fetch('/upload/progress', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      if (result.validation) {
        console.log('Validation warnings:', result.validation.warnings);
      }
    } else {
      console.error('Upload failed:', result.error);
    }
  } catch (error) {
    console.error('Upload error:', error);
  }
});
*/

// ==================== Method 9: API Usage Examples ====================

/*
// Using the built-in API endpoints:

// 1. Upload file
POST /api/media/upload
Content-Type: multipart/form-data

Form data:
- file: (the actual file)
- modelType: "Task"
- modelId: "task-123"
- collection: "documents"

Response:
{
  "success": true,
  "data": {
    "id": "media-456",
    "name": "document.pdf",
    "file_name": "abc123-document.pdf",
    "mime_type": "application/pdf",
    "size": 1024000,
    "path": "task/task-123/documents/abc123-document.pdf",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": []
  }
}

// 2. Download file
GET /api/media/media-456/download
→ Redirects to file URL

// 3. Get file info
GET /api/media/media-456

Response:
{
  "success": true,
  "data": {
    "id": "media-456",
    "url": "http://localhost:3000/uploads/task/task-123/documents/abc123-document.pdf"
  }
}

// 4. List files
GET /api/media?modelType=Task&modelId=task-123&collection=documents

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}

// 5. Delete file
DELETE /api/media/media-456

Response:
{
  "success": true,
  "message": "Media deleted successfully"
}
*/

// ==================== Method 10: Advanced Configuration ====================

// Advanced configuration with all features enabled
const advancedMediaLibrary = createEnhancedMediaLibrary({
  config: defineConfig({
    disk: "s3",
    disks: {
      s3: {
        driver: "s3",
        bucket: "my-media-bucket",
        region: "us-east-1",
        access_key_id: process.env.AWS_ACCESS_KEY_ID!,
        secret_access_key: process.env.AWS_SECRET_ACCESS_KEY!,
        public_base_url: "https://my-media-bucket.s3.amazonaws.com",
      },
    },

    http: {
      enabled: true,
      multipart: {
        enabled: true,
        fileField: "file",
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB for S3
          files: 10,
          fields: 20,
          fieldSize: 2048,
          fieldNameSize: 512,
          parts: 20,
        },
        storage: "memory",
        preservePath: false,
      },
    },

    validation: {
      fileTypes: {
        images: ["jpeg", "jpg", "png", "gif", "webp", "svg", "bmp", "tiff"],
        documents: [
          "pdf",
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
          "odt",
          "ods",
          "odp",
        ],
        text: ["txt", "csv", "json", "xml", "md", "rtf"],
        audio: ["mp3", "wav", "ogg", "aac", "flac", "m4a"],
        video: ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"],
        archives: ["zip", "rar", "7z", "tar", "gz", "bz2"],
      },
      contentValidation: true,
      virusScanning: false,
      maxFileSize: 50 * 1024 * 1024,
      allowedMimeTypes: [
        // Images
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Archives
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
      ],
      maxImageDimensions: {
        width: 4096,
        height: 4096,
      },
      customValidators: [],
    },

    upload: {
      streaming: true,
      progress: true,
      chunked: true,
      tempStorage: true,
    },

    errorHandling: {
      detailed: true,
      validation: {
        onInvalidType:
          "File type not supported. Allowed types: images, documents, archives",
        onSizeExceeded: "File size exceeds maximum allowed size of 50MB",
        onVirusDetected: "File failed security scan",
      },
      retry: {
        maxAttempts: 5,
        backoff: "exponential",
      },
    },
  }),
});

export { app, mediaLibrary, advancedMediaLibrary };
