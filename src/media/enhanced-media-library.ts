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

export interface EnhancedMediaLibraryConfig extends MediaConfig {
  http?: {
    enabled: boolean;
    multipart: MultipartConfig;
  };
  validation?: ValidationConfig;
  upload?: {
    streaming: boolean;
    progress: boolean;
    chunked: boolean;
    tempStorage: boolean;
  };
  errorHandling?: {
    detailed: boolean;
    validation: {
      onInvalidType: string;
      onSizeExceeded: string;
      onVirusDetected: string;
    };
    retry: {
      maxAttempts: number;
      backoff: "linear" | "exponential";
    };
  };
}

export interface UploadOptions extends AttachFileOptions {
  modelType: string;
  modelId: string;
  validate?: boolean;
  process?: boolean;
}

export interface UploadResult {
  media: MediaRecord;
  validation:
    | {
        valid: boolean;
        errors: string[];
        warnings: string[];
      }
    | undefined;
  progress?: number;
}

export class EnhancedMediaLibrary extends MediaLibrary {
  private multipartMiddleware: ReturnType<typeof createMultipartMiddleware>;
  private fileValidator: FileValidator;
  private enhancedConfig: EnhancedMediaLibraryConfig;

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
   * Upload middleware for Express routes
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
   * Upload middleware with progress tracking
   */
  uploadWithProgress(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return this.multipartMiddleware.withProgress(fieldName);
  }

  /**
   * Streaming upload middleware
   */
  streamingUpload(
    fieldName?: string
  ): (req: MultipartRequest, res: Response, next: NextFunction) => void {
    return this.multipartMiddleware.streaming(fieldName);
  }

  /**
   * Enhanced attachFile with built-in validation
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
   * Attach file from request (convenience method)
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
   * Handle upload endpoint with validation and error handling
   */
  uploadHandler() {
    return async (
      req: MultipartRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({
            error: "No file uploaded",
            code: "NO_FILE",
          });
          return;
        }

        // Extract upload parameters from request
        const { modelType, modelId, collection, name, disk } = req.body;

        if (!modelType || !modelId) {
          res.status(400).json({
            error: "Missing required parameters: modelType, modelId",
            code: "MISSING_PARAMETERS",
          });
          return;
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
        res.status(201).json({
          success: true,
          media: result.media,
          validation: result.validation,
          message: "File uploaded successfully",
        });
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Get upload progress from request
   */
  getUploadProgress(req: MultipartRequest): UploadProgress[] | undefined {
    return req.uploadProgress;
  }

  /**
   * Error handling middleware
   * Returns any due to Express middleware type complexity
   */
  errorHandler(): any {
    return this.multipartMiddleware.errorHandler();
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.fileValidator.addCustomValidator(rule);
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(name: string): void {
    this.fileValidator.removeCustomValidator(name);
  }

  /**
   * Get validation configuration
   */
  getValidationConfig(): ValidationConfig {
    return this.fileValidator.getConfig();
  }

  /**
   * Update validation configuration
   */
  updateValidationConfig(config: Partial<ValidationConfig>): void {
    this.fileValidator.updateConfig(config);
  }

  /**
   * Get multipart configuration
   */
  getMultipartConfig(): MultipartConfig {
    return this.multipartMiddleware.getConfig();
  }

  /**
   * Update multipart configuration
   */
  updateMultipartConfig(config: Partial<MultipartConfig>): void {
    this.multipartMiddleware.updateConfig(config);
  }

  /**
   * Create complete upload route handler
   */
  createUploadRoute() {
    return [this.uploadMiddleware(), this.errorHandler(), this.uploadHandler()];
  }

  /**
   * Create upload route with progress tracking
   */
  createUploadRouteWithProgress() {
    return [
      this.uploadWithProgress(),
      this.errorHandler(),
      this.uploadHandler(),
    ];
  }

  /**
   * Create streaming upload route
   */
  createStreamingUploadRoute() {
    return [this.streamingUpload(), this.errorHandler(), this.uploadHandler()];
  }
}

/**
 * Default enhanced media library configuration
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
