import { Request, Response, NextFunction } from "express";
import multer from "multer";

export interface MultipartConfig {
  enabled: boolean;
  fileField?: string;
  limits?: {
    fileSize?: number;
    files?: number;
    fields?: number;
    fieldSize?: number;
    fieldNameSize?: number;
    parts?: number;
  };
  storage?: "memory" | "disk";
  tempDir?: string;
  preservePath?: boolean;
  fileFilter?: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => void;
}

export interface UploadProgress {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimetype: string;
  size: number;
  progress: number; // 0-100
}

export interface MultipartRequest extends Request {
  file?: Express.Multer.File | undefined;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  uploadProgress?: UploadProgress[] | undefined;
}

export class MultipartMiddleware {
  private config: MultipartConfig;
  private upload!: multer.Multer;

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
   * Middleware for single file upload
   */
  single(
    fieldName?: string
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.single(fieldName || this.config.fileField || "file");
  }

  /**
   * Middleware for multiple files upload
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
   * Middleware for mixed field uploads
   */
  fields(
    fields: multer.Field[]
  ): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.fields(fields);
  }

  /**
   * Middleware for any number of files
   */
  any(): (req: Request, res: Response, next: NextFunction) => void {
    return this.upload.any();
  }

  /**
   * Enhanced middleware with progress tracking
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
   * Streaming upload middleware for large files
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
   * Error handling middleware
   * Returns any due to Express middleware type complexity
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
   * Get upload configuration
   */
  getConfig(): MultipartConfig {
    return { ...this.config };
  }

  /**
   * Update upload configuration
   */
  updateConfig(newConfig: Partial<MultipartConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeMulter();
  }
}

/**
 * Create multipart middleware with configuration
 */
export function createMultipartMiddleware(
  config: MultipartConfig
): MultipartMiddleware {
  return new MultipartMiddleware(config);
}

/**
 * Default multipart middleware for media-drive
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
