import { Router, Request, Response, NextFunction } from "express";
import { EnhancedMediaLibrary } from "../media/enhanced-media-library";
import { NotFoundError } from "../core/errors";

export interface ApiRouterConfig {
  basePath: string;
  authentication?: boolean;
  rateLimiting?: {
    uploads: string;
    downloads: string;
  };
  endpoints: {
    upload: string;
    download: string;
    delete: string;
    list: string;
    info: string;
  };
  cors?: boolean;
}

export interface ApiRequest extends Request {
  mediaLibrary?: EnhancedMediaLibrary;
}

export class ApiRouter {
  private mediaLibrary: EnhancedMediaLibrary;
  private config: ApiRouterConfig;
  private router: Router;

  constructor(mediaLibrary: EnhancedMediaLibrary, config: ApiRouterConfig) {
    this.mediaLibrary = mediaLibrary;
    this.config = {
      basePath: "/api/media",
      endpoints: {
        upload: "/upload",
        download: "/:id/download",
        delete: "/:id",
        list: "/",
        info: "/:id",
      },
    };
    this.config = { ...this.config, ...config };
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Upload endpoint
    this.router.post(
      this.config.endpoints.upload,
      this.mediaLibrary.uploadMiddleware(),
      this.mediaLibrary.errorHandler(),
      this.uploadHandler.bind(this)
    );

    // Upload with progress tracking
    this.router.post(
      this.config.endpoints.upload + "/progress",
      this.mediaLibrary.uploadWithProgress(),
      this.mediaLibrary.errorHandler(),
      this.uploadHandler.bind(this)
    );

    // Streaming upload
    this.router.post(
      this.config.endpoints.upload + "/stream",
      this.mediaLibrary.streamingUpload(),
      this.mediaLibrary.errorHandler(),
      this.uploadHandler.bind(this)
    );

    // Download endpoint
    this.router.get(
      this.config.endpoints.download,
      this.downloadHandler.bind(this)
    );

    // Delete endpoint
    this.router.delete(
      this.config.endpoints.delete,
      this.deleteHandler.bind(this)
    );

    // List endpoint
    this.router.get(this.config.endpoints.list, this.listHandler.bind(this));

    // Get media info
    this.router.get(this.config.endpoints.info, this.infoHandler.bind(this));

    // Health check
    this.router.get("/health", this.healthHandler.bind(this));

    // Error handling
    this.router.use(this.errorHandler.bind(this));
  }

  /**
   * Upload handler
   */
  private async uploadHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: "No file uploaded",
          code: "NO_FILE",
        });
        return;
      }

      const { modelType, modelId, collection, name, disk } = req.body;

      if (!modelType || !modelId) {
        res.status(400).json({
          error: "Missing required parameters: modelType, modelId",
          code: "MISSING_PARAMETERS",
        });
        return;
      }

      const result = await this.mediaLibrary.attachFileWithValidation(
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

      res.status(201).json({
        success: true,
        data: result.media,
        validation: result.validation,
        message: "File uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download handler
   */
  private async downloadHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { conversion, signed } = req.query;

      if (!id) {
        res.status(400).json({
          error: "Missing media ID",
          code: "MISSING_ID",
        });
        return;
      }

      const url = await this.mediaLibrary.resolveFileUrl(
        id,
        conversion as string,
        signed === "true"
      );

      // Redirect to file URL
      res.redirect(url);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: "Media not found",
          code: "NOT_FOUND",
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Delete handler
   */
  private async deleteHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: "Missing media ID",
          code: "MISSING_ID",
        });
        return;
      }

      await this.mediaLibrary.remove(id);

      res.json({
        success: true,
        message: "Media deleted successfully",
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: "Media not found",
          code: "NOT_FOUND",
        });
        return;
      }
      next(error);
    }
  }

  /**
   * List handler
   */
  private async listHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        modelType,
        modelId,
        collection,
        page = "1",
        limit = "10",
      } = req.query;

      if (!modelType || !modelId) {
        res.status(400).json({
          error: "Missing required parameters: modelType, modelId",
          code: "MISSING_PARAMETERS",
        });
        return;
      }

      const mediaList = await this.mediaLibrary.list(
        modelType as string,
        modelId as string,
        collection as string
      );

      // Simple pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedMedia = mediaList.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedMedia,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: mediaList.length,
          pages: Math.ceil(mediaList.length / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Info handler
   */
  private async infoHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: "Missing media ID",
          code: "MISSING_ID",
        });
        return;
      }

      // Get media info (this would need to be implemented in MediaLibrary)
      // For now, just return basic info
      const url = await this.mediaLibrary.resolveFileUrl(id);

      res.json({
        success: true,
        data: {
          id,
          url,
          // Additional media info would go here
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: "Media not found",
          code: "NOT_FOUND",
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Health check handler
   */
  private healthHandler(_req: Request, res: Response): void {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "3.0.0",
    });
  }

  /**
   * Error handler
   */
  private errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    console.error("API Error:", error);

    // Default error response
    let status = 500;
    let message = "Internal server error";
    let code = "INTERNAL_ERROR";

    // Handle specific error types
    if (error.name === "ValidationError") {
      status = 400;
      message = error.message;
      code = "VALIDATION_ERROR";
    } else if (error.name === "MulterError") {
      status = 400;
      message = error.message;
      code = "UPLOAD_ERROR";
    } else if (
      error.message &&
      error.message.includes("File validation failed")
    ) {
      status = 400;
      message = error.message;
      code = "VALIDATION_ERROR";
    }

    res.status(status).json({
      error: message,
      code,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get API configuration
   */
  getConfig(): ApiRouterConfig {
    return { ...this.config };
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<ApiRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Re-setup routes if endpoints changed
    this.router = Router();
    this.setupRoutes();
  }
}

/**
 * Create API router for media-drive
 */
export function createApiRouter(
  mediaLibrary: EnhancedMediaLibrary,
  config: Partial<ApiRouterConfig> = {}
): ApiRouter {
  const defaultConfig: ApiRouterConfig = {
    basePath: "/api/media",
    endpoints: {
      upload: "/upload",
      download: "/:id/download",
      delete: "/:id",
      list: "/",
      info: "/:id",
    },
  };

  return new ApiRouter(mediaLibrary, { ...defaultConfig, ...config });
}

/**
 * Default API router configuration
 */
export function defaultApiConfig(): Partial<ApiRouterConfig> {
  return {
    basePath: "/api/media",
    endpoints: {
      upload: "/upload",
      download: "/:id/download",
      delete: "/:id",
      list: "/",
      info: "/:id",
    },
    cors: true,
  };
}
