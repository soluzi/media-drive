/**
 * Enhanced Media Library
 *
 * Extends MediaLibrary with HTTP support, built-in validation, and enhanced upload features.
 * Provides Express middleware, file validation, progress tracking, and streaming uploads.
 * Designed for web applications that need comprehensive file upload handling.
 */

import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { MediaLibrary } from "./media-library";
import {
  createMultipartMiddleware,
  MultipartRequest,
  MultipartConfig,
  UploadProgress,
} from "../http/multipart";
import {
  createFileValidator,
  FileValidator,
  ValidationConfig,
  ValidationRule,
} from "../validation/file-validator";
import { MediaConfig } from "../config/schema";
import { AttachFileOptions, MediaRecord } from "../types";
import {
  StorageDriver,
  ConversionProcessor,
  QueueDriver,
  PathGenerator,
  FileNamer,
} from "../core/contracts";
import {
  noFile,
  missingParameters,
  createdWithMessage,
} from "../core/responders/http";

/**
 * Enhanced media library configuration.
 * Extends MediaConfig with HTTP, validation, upload, and error handling options.
 */
export interface EnhancedMediaLibraryConfig extends MediaConfig {
  /** HTTP-related configuration for Express integration. */
  http?: {
    /** Whether HTTP features are enabled. */
    enabled: boolean;
    /** Multipart form data handling configuration. */
    multipart: MultipartConfig;
  };
  /** File validation configuration. */
  validation?: ValidationConfig;
  /** Upload behavior configuration. */
  upload?: {
    /** Enable streaming uploads (for large files). */
    streaming: boolean;
    /** Enable upload progress tracking. */
    progress: boolean;
    /** Enable chunked uploads. */
    chunked: boolean;
    /** Use temporary storage before final upload. */
    tempStorage: boolean;
  };
  /** Error handling configuration. */
  errorHandling?: {
    /** Return detailed error messages. */
    detailed: boolean;
    /** Custom error messages for validation failures. */
    validation: {
      /** Message when file type is invalid. */
      onInvalidType: string;
      /** Message when file size exceeds limit. */
      onSizeExceeded: string;
      /** Message when virus is detected. */
      onVirusDetected: string;
    };
    /** Retry configuration for failed uploads. */
    retry: {
      /** Maximum retry attempts. */
      maxAttempts: number;
      /** Backoff strategy: linear or exponential. */
      backoff: "linear" | "exponential";
    };
  };
}

/**
 * Options for file upload operations.
 * Extends AttachFileOptions with enhanced-specific options.
 */
export interface UploadOptions extends AttachFileOptions {
  /** Model type (e.g., "User", "Post"). */
  modelType: string;
  /** Model ID (e.g., "123"). */
  modelId: string;
  /** Whether to validate the file before upload (default: true). */
  validate?: boolean;
  /** Whether to process conversions immediately (default: false). */
  process?: boolean;
}

/**
 * Result of file upload operation.
 * Includes media record, validation results, and optional progress information.
 */
export interface UploadResult {
  /** Created media record. */
  media: MediaRecord;
  /** File validation results (if validation was performed). */
  validation:
    | {
        /** Whether file passed validation. */
        valid: boolean;
        /** Array of validation error messages. */
        errors: string[];
        /** Array of validation warning messages. */
        warnings: string[];
      }
    | undefined;
  /** Upload progress percentage (0-100) if progress tracking is enabled. */
  progress?: number;
}

/**
 * Enhanced Media Library with HTTP support and validation.
 *
 * Extends MediaLibrary with:
 * - Express middleware for file uploads
 * - Built-in file validation
 * - Upload progress tracking
 * - Streaming upload support
 * - Error handling middleware
 * - Dynamic configuration updates
 *
 * Suitable for web applications that need comprehensive file upload handling
 * with validation, progress tracking, and Express integration.
 */
export class EnhancedMediaLibrary extends MediaLibrary {
  private multipartMiddleware: ReturnType<typeof createMultipartMiddleware>;
  private fileValidator: FileValidator;
  private enhancedConfig: EnhancedMediaLibraryConfig;

  /**
   * Creates a new EnhancedMediaLibrary instance.
   *
   * @param config - Enhanced media library configuration with HTTP and validation options.
   * @param prisma - Prisma client instance for database operations.
   * @param storageDriver - Storage driver for file operations.
   * @param pathGenerator - Path generator for organizing files.
   * @param fileNamer - File namer for generating filenames.
   * @param conversionProcessor - Optional conversion processor for image processing.
   * @param queueDriver - Optional queue driver for async conversions.
   */
  constructor(
    config: EnhancedMediaLibraryConfig,
    prisma: PrismaClient,
    storageDriver: StorageDriver,
    pathGenerator: PathGenerator,
    fileNamer: FileNamer,
    conversionProcessor?: ConversionProcessor | undefined,
    queueDriver?: QueueDriver | undefined
  ) {
    super(
      config,
      prisma,
      storageDriver,
      pathGenerator,
      fileNamer,
      conversionProcessor,
      queueDriver
    );
    this.enhancedConfig = config;

    // Initialize multipart middleware
    this.multipartMiddleware = createMultipartMiddleware(
      config.http?.multipart || {
        enabled: true,
        fileField: "file",
        limits: {
          fileSize: 10 * 1024 * 1024,
          files: 5,
        },
        storage: "memory",
      }
    );

    // Initialize file validator
    this.fileValidator = createFileValidator(this.enhancedConfig.validation);
  }

  /**
   * Get Express middleware for handling single file uploads.
   * Parses multipart/form-data and attaches file to request object.
   *
   * @param fieldName - Form field name containing the file (default: "file").
   * @returns Express middleware function for single file upload.
   *
   * @example
   * ```typescript
   * app.post("/upload", mediaLibrary.uploadMiddleware("file"), (req, res) => {
   *   // req.file is available here
   * });
   * ```
   */
  uploadMiddleware(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return this.multipartMiddleware.single(fieldName) as (
      req: MultipartRequest,
      res: Response,
      next: NextFunction
    ) => void;
  }

  /**
   * Get Express middleware for file uploads with progress tracking.
   * Tracks upload progress and attaches progress information to request.
   *
   * @param fieldName - Form field name containing the file (default: "file").
   * @returns Express middleware function with progress tracking.
   *
   * @example
   * ```typescript
   * app.post("/upload", mediaLibrary.uploadWithProgress(), (req, res) => {
   *   const progress = mediaLibrary.getUploadProgress(req);
   *   // progress contains upload percentage
   * });
   * ```
   */
  uploadWithProgress(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return this.multipartMiddleware.withProgress(fieldName);
  }

  /**
   * Get Express middleware for streaming file uploads.
   * Efficient for large files, streams data directly to storage without buffering.
   *
   * @param fieldName - Form field name containing the file (default: "file").
   * @returns Express middleware function for streaming uploads.
   *
   * @example
   * ```typescript
   * app.post("/upload-large", mediaLibrary.streamingUpload(), (req, res) => {
   *   // File is streamed directly to storage
   * });
   * ```
   */
  streamingUpload(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return this.multipartMiddleware.streaming(fieldName);
  }

  /**
   * Attach file with built-in validation.
   * Validates file before uploading and returns validation results.
   *
   * @param modelType - Model type (e.g., "User", "Post").
   * @param modelId - Model ID (e.g., "123").
   * @param file - Multer file object from Express request.
   * @param options - Upload options including validation settings.
   * @returns Promise resolving to upload result with media record and validation results.
   * @throws {Error} If validation fails and validate option is true.
   *
   * @example
   * ```typescript
   * const result = await mediaLibrary.attachFileWithValidation(
   *   "User",
   *   "123",
   *   req.file,
   *   { collection: "avatars", validate: true }
   * );
   *
   * if (result.validation?.valid) {
   *   console.log("File uploaded successfully:", result.media);
   * }
   * ```
   */
  async attachFileWithValidation(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options: UploadOptions = {} as UploadOptions
  ): Promise<UploadResult> {
    const {
      collection = "default",
      name = file.originalname,
      disk,
      conversions = {},
      customProperties = {},
      validate = true,
    } = options;

    let validationResult;

    // Validate file if requested
    if (validate) {
      validationResult = await this.fileValidator.validate(file);
      if (!validationResult.valid) {
        throw new Error(
          `File validation failed: ${validationResult.errors.join(", ")}`
        );
      }
    }

    // Attach file using parent class method
    const media = await super.attachFile(modelType, modelId, file, {
      collection,
      name,
      disk,
      conversions,
      customProperties,
    });

    return {
      media,
      validation: validationResult,
    };
  }

  /**
   * Attach file from Express request (convenience method).
   * Extracts file from request and uploads with validation enabled.
   *
   * @param req - Express request with uploaded file (req.file must exist).
   * @param options - Upload options (validate is always true).
   * @returns Promise resolving to upload result with media record and validation.
   * @throws {Error} If no file is uploaded or validation fails.
   *
   * @example
   * ```typescript
   * app.post("/upload", mediaLibrary.uploadMiddleware(), async (req, res) => {
   *   const result = await mediaLibrary.attachFromRequest(req, {
   *     modelType: "User",
   *     modelId: req.user.id,
   *     collection: "documents"
   *   });
   *   res.json(result);
   * });
   * ```
   */
  async attachFromRequest(
    req: MultipartRequest,
    options: Omit<UploadOptions, "validate"> = {} as Omit<
      UploadOptions,
      "validate"
    >
  ): Promise<UploadResult> {
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    return this.attachFileWithValidation(
      options.modelType,
      options.modelId,
      req.file,
      {
        ...options,
        validate: true,
      }
    );
  }

  /**
   * Get Express route handler for file uploads.
   * Handles file upload with validation, extracts parameters from request body,
   * and returns standardized JSON response.
   *
   * Expects request body to contain: modelType, modelId, collection (optional), name (optional), disk (optional).
   *
   * @returns Express route handler function.
   *
   * @example
   * ```typescript
   * app.post(
   *   "/upload",
   *   mediaLibrary.uploadMiddleware(),
   *   mediaLibrary.uploadHandler()
   * );
   * ```
   */
  uploadHandler() {
    return async (
      req: MultipartRequest,
      res: Response,
      next: NextFunction
    ): Promise<void | Response> => {
      try {
        if (!req.file) {
          return noFile(res);
        }

        // Extract upload parameters from request
        const { modelType, modelId, collection, name, disk } = req.body;

        if (!modelType || !modelId) {
          return missingParameters(res, undefined, "modelType, modelId");
        }

        // Upload file with validation
        const result = await this.attachFileWithValidation(
          modelType,
          modelId,
          req.file,
          {
            modelType,
            modelId,
            collection,
            name,
            disk,
            validate: true,
          }
        );

        // Return success response
        return createdWithMessage(
          res,
          {
            media: result.media,
            validation: result.validation,
          },
          "File uploaded successfully"
        );
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Get upload progress information from request.
   * Only available when using uploadWithProgress() middleware.
   *
   * @param req - Express request with upload progress attached.
   * @returns Array of upload progress objects or undefined if not available.
   *
   * @example
   * ```typescript
   * app.post("/upload", mediaLibrary.uploadWithProgress(), (req, res) => {
   *   const progress = mediaLibrary.getUploadProgress(req);
   *   if (progress) {
   *     console.log(`Upload progress: ${progress[0].percentage}%`);
   *   }
   * });
   * ```
   */
  getUploadProgress(req: MultipartRequest): UploadProgress[] | undefined {
    return req.uploadProgress;
  }

  /**
   * Get Express error handling middleware for upload errors.
   * Handles multipart parsing errors and validation errors.
   *
   * @returns Express error handler middleware function.
   *
   * @example
   * ```typescript
   * app.post(
   *   "/upload",
   *   mediaLibrary.uploadMiddleware(),
   *   mediaLibrary.uploadHandler(),
   *   mediaLibrary.errorHandler()
   * );
   * ```
   */
  errorHandler(): any {
    return this.multipartMiddleware.errorHandler();
  }

  /**
   * Add custom validation rule to file validator.
   *
   * @param rule - Validation rule to add.
   *
   * @example
   * ```typescript
   * mediaLibrary.addValidationRule({
   *   name: "customCheck",
   *   validate: async (file) => {
   *     // Custom validation logic
   *     return { valid: true };
   *   }
   * });
   * ```
   */
  addValidationRule(rule: ValidationRule): void {
    this.fileValidator.addCustomValidator(rule);
  }

  /**
   * Remove custom validation rule by name.
   *
   * @param name - Name of the validation rule to remove.
   */
  removeValidationRule(name: string): void {
    this.fileValidator.removeCustomValidator(name);
  }

  /**
   * Get current validation configuration.
   *
   * @returns Current validation configuration object.
   */
  getValidationConfig(): ValidationConfig {
    return this.fileValidator.getConfig();
  }

  /**
   * Update validation configuration dynamically.
   *
   * @param config - Partial validation configuration to merge with existing config.
   */
  updateValidationConfig(config: Partial<ValidationConfig>): void {
    this.fileValidator.updateConfig(config);
  }

  /**
   * Get current multipart middleware configuration.
   *
   * @returns Current multipart configuration object.
   */
  getMultipartConfig(): MultipartConfig {
    return this.multipartMiddleware.getConfig();
  }

  /**
   * Update multipart middleware configuration dynamically.
   *
   * @param config - Partial multipart configuration to merge with existing config.
   */
  updateMultipartConfig(config: Partial<MultipartConfig>): void {
    this.multipartMiddleware.updateConfig(config);
  }

  /**
   * Create complete upload route handler array.
   * Returns array of middleware functions ready to use with Express routes.
   *
   * @returns Array of Express middleware functions: [uploadMiddleware, errorHandler, uploadHandler].
   *
   * @example
   * ```typescript
   * app.post("/upload", ...mediaLibrary.createUploadRoute());
   * ```
   */
  createUploadRoute() {
    return [this.uploadMiddleware(), this.errorHandler(), this.uploadHandler()];
  }

  /**
   * Create upload route handler array with progress tracking.
   * Returns array of middleware functions with progress tracking enabled.
   *
   * @returns Array of Express middleware functions: [uploadWithProgress, errorHandler, uploadHandler].
   *
   * @example
   * ```typescript
   * app.post("/upload", ...mediaLibrary.createUploadRouteWithProgress());
   * ```
   */
  createUploadRouteWithProgress() {
    return [
      this.uploadWithProgress(),
      this.errorHandler(),
      this.uploadHandler(),
    ];
  }

  /**
   * Create streaming upload route handler array.
   * Returns array of middleware functions for streaming large file uploads.
   *
   * @returns Array of Express middleware functions: [streamingUpload, errorHandler, uploadHandler].
   *
   * @example
   * ```typescript
   * app.post("/upload-large", ...mediaLibrary.createStreamingUploadRoute());
   * ```
   */
  createStreamingUploadRoute() {
    return [this.streamingUpload(), this.errorHandler(), this.uploadHandler()];
  }
}

/**
 * Get default enhanced media library configuration.
 * Provides sensible defaults for HTTP, validation, upload, and error handling settings.
 *
 * @returns Partial configuration object with default values for enhanced features.
 *
 * @example
 * ```typescript
 * const config = {
 *   ...defaultEnhancedConfig(),
 *   disk: "s3",
 *   disks: { s3: { ... } }
 * };
 * const mediaLibrary = createEnhancedMediaLibrary({ config });
 * ```
 */
export function defaultEnhancedConfig(): Partial<EnhancedMediaLibraryConfig> {
  return {
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
    upload: {
      streaming: false,
      progress: true,
      chunked: false,
      tempStorage: false,
    },
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
  };
}
