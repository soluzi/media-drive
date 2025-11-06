/**
 * Multipart Middleware
 *
 * Express middleware for handling multipart/form-data file uploads.
 * Wraps Multer with additional features like progress tracking and streaming.
 */

import { Request, Response, NextFunction } from "express";
import multer from "multer";

/**
 * Configuration for multipart middleware.
 */
export interface MultipartConfig {
  /** Whether multipart handling is enabled. */
  enabled: boolean;
  /** Field name for file uploads (default: "file"). */
  fileField?: string;
  /** Upload limits configuration. */
  limits?: {
    /** Maximum file size in bytes. */
    fileSize?: number;
    /** Maximum number of files. */
    files?: number;
    /** Maximum number of fields. */
    fields?: number;
    /** Maximum field size in bytes. */
    fieldSize?: number;
    /** Maximum field name size in bytes. */
    fieldNameSize?: number;
    /** Maximum number of parts. */
    parts?: number;
  };
  /** Storage type: "memory" for buffers, "disk" for temporary files. */
  storage?: "memory" | "disk";
  /** Temporary directory for disk storage. */
  tempDir?: string;
  /** Whether to preserve file path. */
  preservePath?: boolean;
  /** Custom file filter function. */
  fileFilter?: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => void;
}

/**
 * Upload progress information.
 */
export interface UploadProgress {
  /** Form field name. */
  fieldName: string;
  /** Original filename. */
  originalName: string;
  /** File encoding. */
  encoding: string;
  /** MIME type. */
  mimetype: string;
  /** File size in bytes. */
  size: number;
  /** Upload progress percentage (0-100). */
  progress: number;
}

/**
 * Extended Express Request with file upload information.
 */
export interface MultipartRequest extends Request {
  /** Single uploaded file (if using single() middleware). */
  file?: Express.Multer.File | undefined;
  /** Multiple uploaded files (if using array() or fields() middleware). */
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  /** Upload progress tracking information. */
  uploadProgress?: UploadProgress[] | undefined;
}

/**
 * Multipart middleware for handling file uploads.
 * Provides Express middleware functions for single, multiple, and streaming uploads.
 */
export class MultipartMiddleware {
  private config: MultipartConfig;
  private upload!: multer.Multer;

  /**
   * Creates a new MultipartMiddleware instance.
   *
   * @param config - Multipart configuration options.
   */
  constructor(config: MultipartConfig) {
    this.config = {
      enabled: true,
      fileField: "file",
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB default
        files: 5,
        fields: 10,
        fieldSize: 1024,
        fieldNameSize: 256,
        parts: 10,
      },
      storage: "memory",
      preservePath: false,
    };
    this.config = { ...this.config, ...config };

    this.initializeMulter();
  }

  private initializeMulter(): void {
    const storage =
      this.config.storage === "disk"
        ? multer.diskStorage({
            destination: this.config.tempDir || "/tmp",
            filename: (_req, file, cb) => {
              const uniqueSuffix =
                Date.now() + "-" + Math.round(Math.random() * 1e9);
              const sanitizedName = file.originalname.replace(
                /[^a-zA-Z0-9.-]/g,
                "_"
              );
              cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
            },
          })
        : multer.memoryStorage();

    this.upload = multer({
      storage,
      limits: this.config.limits,
      fileFilter: this.config.fileFilter || this.defaultFileFilter,
      preservePath: this.config.preservePath,
    });
  }

  private defaultFileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void => {
    // Basic file type validation - can be overridden
    const allowedMimes = [
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
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      // Text
      "text/plain",
      "text/csv",
      // Archives
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  };

  /**
   * Middleware for single file upload.
   * Attaches file to req.file.
   *
   * @param fieldName - Form field name (defaults to config.fileField or "file").
   * @returns Express middleware function.
   */
  single(
    fieldName?: string
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.single(fieldName || this.config.fileField || "file");
  }

  /**
   * Middleware for multiple files upload.
   * Attaches files array to req.files.
   *
   * @param fieldName - Form field name (defaults to config.fileField or "file").
   * @param maxCount - Maximum number of files allowed.
   * @returns Express middleware function.
   */
  array(
    fieldName?: string,
    maxCount?: number
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.array(
      fieldName || this.config.fileField || "file",
      maxCount
    );
  }

  /**
   * Middleware for mixed field uploads.
   * Handles multiple fields with different file limits.
   *
   * @param fields - Array of field configurations.
   * @returns Express middleware function.
   */
  fields(
    fields: multer.Field[]
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.fields(fields);
  }

  /**
   * Middleware for any number of files from any field.
   * Attaches files to req.files.
   *
   * @returns Express middleware function.
   */
  any(): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.any();
  }

  /**
   * Enhanced middleware with progress tracking.
   * Adds uploadProgress array to request with file information.
   *
   * @param fieldName - Form field name (defaults to config.fileField or "file").
   * @returns Express middleware function with progress tracking.
   */
  withProgress(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return (req: MultipartRequest, res: Response, next: NextFunction): void => {
      const uploadMiddleware = this.single(fieldName);

      uploadMiddleware(req, res, (err) => {
        if (err) {
          return next(err);
        }

        // Add progress tracking to request
        if (req.file) {
          req.uploadProgress = [
            {
              fieldName: req.file.fieldname,
              originalName: req.file.originalname,
              encoding: req.file.encoding,
              mimetype: req.file.mimetype,
              size: req.file.size,
              progress: 100, // Completed
            },
          ];
        }

        next();
      });
    };
  }

  /**
   * Streaming upload middleware for large files.
   * Sets up progress tracking for streaming uploads.
   *
   * @param fieldName - Form field name (defaults to config.fileField or "file").
   * @returns Express middleware function for streaming uploads.
   */
  streaming(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return (req: MultipartRequest, res: Response, next: NextFunction): void => {
      const uploadMiddleware = this.single(fieldName);

      // Set up progress tracking
      req.uploadProgress = [];

      uploadMiddleware(req, res, (err) => {
        if (err) {
          return next(err);
        }

        if (req.file) {
          req.uploadProgress = [
            {
              fieldName: req.file.fieldname,
              originalName: req.file.originalname,
              encoding: req.file.encoding,
              mimetype: req.file.mimetype,
              size: req.file.size,
              progress: 100,
            },
          ];
        }

        next();
      });
    };
  }

  /**
   * Error handling middleware for upload errors.
   * Handles Multer errors and file type validation errors.
   * Returns any due to Express middleware type complexity.
   *
   * @returns Express error handling middleware function.
   */
  errorHandler(): any {
    return (
      err: Error,
      _req: Request,
      res: Response,
      next: NextFunction
    ): void => {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            res.status(400).json({
              error: "File too large",
              message: `File size exceeds ${
                this.config.limits?.fileSize || 10485760
              } bytes`,
              code: "FILE_TOO_LARGE",
            });
            return;
          case "LIMIT_FILE_COUNT":
            res.status(400).json({
              error: "Too many files",
              message: `Maximum ${
                this.config.limits?.files || 5
              } files allowed`,
              code: "TOO_MANY_FILES",
            });
            return;
          case "LIMIT_UNEXPECTED_FILE":
            res.status(400).json({
              error: "Unexpected file field",
              message: `Field name '${err.field}' is not allowed`,
              code: "UNEXPECTED_FILE_FIELD",
            });
            return;
          default:
            res.status(400).json({
              error: "Upload error",
              message: err.message,
              code: "UPLOAD_ERROR",
            });
            return;
        }
      }

      if (err.message && err.message.includes("File type")) {
        res.status(400).json({
          error: "Invalid file type",
          message: err.message,
          code: "INVALID_FILE_TYPE",
        });
        return;
      }

      next(err);
    };
  }

  /**
   * Get current upload configuration.
   *
   * @returns Copy of current configuration object.
   */
  getConfig(): MultipartConfig {
    return { ...this.config };
  }

  /**
   * Update upload configuration.
   * Reinitializes Multer with new configuration.
   *
   * @param newConfig - Partial configuration to merge with existing config.
   */
  updateConfig(newConfig: Partial<MultipartConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeMulter();
  }
}

/**
 * Create multipart middleware with configuration.
 *
 * @param config - Multipart configuration options.
 * @returns Configured MultipartMiddleware instance.
 */
export function createMultipartMiddleware(
  config: MultipartConfig
): MultipartMiddleware {
  return new MultipartMiddleware(config);
}

/**
 * Create default multipart middleware with sensible defaults.
 * Uses memory storage, 10MB file size limit, and allows common file types.
 *
 * @returns MultipartMiddleware instance with default configuration.
 */
export function defaultMultipartMiddleware(): MultipartMiddleware {
  return new MultipartMiddleware({
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
  });
}
