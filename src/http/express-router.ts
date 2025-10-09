/**
 * Express Router Adapter
 *
 * Provides REST endpoints for media operations
 */

import { Router, Request, Response, NextFunction } from "express";
import { MediaLibrary } from "../media/media-library";
import { getLogger } from "../core/logger";

const logger = getLogger();

export interface MediaRequest extends Request {
  mediaLibrary?: MediaLibrary;
}

export interface RouterOptions {
  /**
   * Authentication middleware
   */
  authMiddleware?:
    | ((req: Request, res: Response, next: NextFunction) => void)
    | undefined;

  /**
   * Custom error handler
   */
  errorHandler?:
    | ((err: Error, req: Request, res: Response, next: NextFunction) => void)
    | undefined;
}

/**
 * Create Express router for media operations
 */
export function createMediaRouter(
  mediaLibrary: MediaLibrary,
  options: RouterOptions = {}
): Router {
  const router = Router();

  // Attach mediaLibrary to request
  router.use((req: MediaRequest, _res, next) => {
    req.mediaLibrary = mediaLibrary;
    next();
  });

  // Apply auth middleware if provided
  if (options.authMiddleware) {
    router.use(options.authMiddleware);
  }

  /**
   * GET /media/:modelType/:modelId
   * List media for a model
   */
  router.get(
    "/media/:modelType/:modelId",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { modelType, modelId } = req.params;
        const { collection } = req.query;

        if (!modelType || !modelId) {
          return res
            .status(400)
            .json({ error: "modelType and modelId are required" });
        }

        const media = await req.mediaLibrary!.list(
          modelType,
          modelId,
          collection as string | undefined
        );

        return res.json({ data: media });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * POST /media/:modelType/:modelId
   * Attach file to a model
   */
  router.post(
    "/media/:modelType/:modelId",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { modelType, modelId } = req.params;
        const { collection, name, disk, conversions, customProperties } =
          req.body;

        if (!modelType || !modelId) {
          return res
            .status(400)
            .json({ error: "modelType and modelId are required" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const media = await req.mediaLibrary!.attachFile(
          modelType,
          modelId,
          req.file as Express.Multer.File,
          {
            collection,
            name,
            disk,
            conversions: conversions ? JSON.parse(conversions) : undefined,
            customProperties: customProperties
              ? JSON.parse(customProperties)
              : undefined,
          }
        );

        return res.status(201).json({ data: media });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * POST /media/:modelType/:modelId/from-url
   * Attach file from URL
   */
  router.post(
    "/media/:modelType/:modelId/from-url",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { modelType, modelId } = req.params;
        const {
          url,
          collection,
          name,
          disk,
          conversions,
          customProperties,
          headers,
          timeout,
        } = req.body;

        if (!modelType || !modelId) {
          return res
            .status(400)
            .json({ error: "modelType and modelId are required" });
        }

        if (!url) {
          return res.status(400).json({ error: "URL is required" });
        }

        const media = await req.mediaLibrary!.attachFromUrl(
          modelType,
          modelId,
          url,
          {
            collection,
            name,
            disk,
            conversions,
            customProperties,
            headers,
            timeout,
          }
        );

        return res.status(201).json({ data: media });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * DELETE /media/:mediaId
   * Remove media
   */
  router.delete(
    "/media/:mediaId",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { mediaId } = req.params;

        if (!mediaId) {
          return res.status(400).json({ error: "mediaId is required" });
        }

        await req.mediaLibrary!.remove(mediaId);

        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * GET /media/:mediaId/url
   * Get file URL
   */
  router.get(
    "/media/:mediaId/url",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { mediaId } = req.params;
        const { conversion, signed } = req.query;

        if (!mediaId) {
          return res.status(400).json({ error: "mediaId is required" });
        }

        const url = await req.mediaLibrary!.resolveFileUrl(
          mediaId,
          conversion as string | undefined,
          signed === "true"
        );

        return res.json({ url });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * POST /media/:mediaId/conversions
   * Process conversions asynchronously
   */
  router.post(
    "/media/:mediaId/conversions",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { mediaId } = req.params;
        const { conversions } = req.body;

        if (!mediaId) {
          return res.status(400).json({ error: "mediaId is required" });
        }

        if (!conversions) {
          return res.status(400).json({ error: "Conversions are required" });
        }

        const jobId = await req.mediaLibrary!.processConversionsAsync(
          mediaId,
          conversions
        );

        return res.status(202).json({ jobId });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * GET /jobs/:jobId
   * Get job status
   */
  router.get(
    "/jobs/:jobId",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const { jobId } = req.params;

        if (!jobId) {
          return res.status(400).json({ error: "jobId is required" });
        }

        const status = await req.mediaLibrary!.getConversionJobStatus(jobId);

        return res.json({ data: status });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * GET /queue/stats
   * Get queue statistics
   */
  router.get(
    "/queue/stats",
    async (req: MediaRequest, res: Response, next: NextFunction) => {
      try {
        const stats = await req.mediaLibrary!.getQueueStats();

        return res.json({ data: stats });
      } catch (error) {
        return next(error);
      }
    }
  );

  // Error handler
  if (options.errorHandler) {
    router.use(options.errorHandler);
  } else {
    router.use(
      (err: Error, _req: Request, res: Response, _next: NextFunction) => {
        logger.error("Media router error", err);

        return res.status(500).json({
          error: err.message || "Internal server error",
        });
      }
    );
  }

  return router;
}
