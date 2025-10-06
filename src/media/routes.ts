import { Router, Response } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { MediaLibrary } from "./service";
import { MediaRequest } from "../types";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, _file, cb) => {
    // Accept all file types, but you can add filtering here
    cb(null, true);
  },
});

export function createMediaRouter(prisma?: PrismaClient): Router {
  const router = Router();
  const mediaLibrary = new MediaLibrary(prisma);

  // Add media library service to request object
  router.use((req: MediaRequest, _res: Response, next) => {
    req.mediaLibrary = mediaLibrary;
    next();
  });

  // POST /media/:modelType/:modelId/:collection - Upload file
  router.post(
    "/:modelType/:modelId/:collection",
    upload.single("file"),
    async (req: MediaRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const { modelType, modelId, collection } = req.params;
        const { name, disk, conversions, customProperties } = req.body;

        if (!modelType || !modelId || !collection) {
          return res
            .status(400)
            .json({ error: "modelType, modelId, and collection are required" });
        }

        let parsedConversions = {};
        let parsedCustomProperties = {};

        if (conversions) {
          try {
            parsedConversions = JSON.parse(conversions);
          } catch {
            return res.status(400).json({ error: "Invalid conversions JSON" });
          }
        }

        if (customProperties) {
          try {
            parsedCustomProperties = JSON.parse(customProperties);
          } catch {
            return res
              .status(400)
              .json({ error: "Invalid custom properties JSON" });
          }
        }

        const mediaRecord = await req.mediaLibrary!.attachFile(
          modelType,
          modelId,
          req.file,
          {
            collection,
            name,
            disk,
            conversions: parsedConversions,
            customProperties: parsedCustomProperties,
          }
        );

        return res.status(201).json(mediaRecord);
      } catch (error: any) {
        console.error("Upload error:", error);
        return res
          .status(500)
          .json({ error: error.message || "Upload failed" });
      }
    }
  );

  // POST /media/from-url - Attach file from URL
  router.post("/from-url", async (req: MediaRequest, res: Response) => {
    try {
      const {
        modelType,
        modelId,
        url,
        collection = "default",
        name,
        disk,
        conversions = {},
        customProperties = {},
        headers = {},
        timeout = 30000,
      } = req.body;

      if (!modelType || !modelId || !url) {
        return res.status(400).json({
          error: "modelType, modelId, and url are required",
        });
      }

      const mediaRecord = await req.mediaLibrary!.attachFromUrl(
        modelType,
        modelId,
        url,
        {
          collection,
          name,
          disk: disk as "local" | "s3" | "bunnycdn" | undefined,
          conversions,
          customProperties,
          headers,
          timeout,
        }
      );

      return res.status(201).json(mediaRecord);
    } catch (error: any) {
      console.error("URL attachment error:", error);
      return res
        .status(500)
        .json({ error: error.message || "URL attachment failed" });
    }
  });

  // GET /media/:modelType/:modelId - List media for a model
  router.get(
    "/:modelType/:modelId",
    async (req: MediaRequest, res: Response) => {
      try {
        const { modelType, modelId } = req.params;
        const { collection } = req.query;

        if (!modelType || !modelId) {
          return res
            .status(400)
            .json({ error: "modelType and modelId are required" });
        }

        const mediaRecords = await req.mediaLibrary!.list(
          modelType,
          modelId,
          collection as string
        );

        return res.json(mediaRecords);
      } catch (error: any) {
        console.error("List error:", error);
        return res
          .status(500)
          .json({ error: error.message || "Failed to list media" });
      }
    }
  );

  // GET /media/file/:id - Get file URL or redirect to file
  router.get("/file/:id", async (req: MediaRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { conversion, signed = "0", redirect = "0" } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Media ID is required" });
      }

      const isSigned = signed === "1";
      const shouldRedirect = redirect === "1";

      const fileUrl = await req.mediaLibrary!.resolveFileUrl(
        id,
        conversion as string,
        isSigned,
        shouldRedirect
      );

      if (shouldRedirect) {
        return res.redirect(fileUrl);
      } else {
        return res.json({ url: fileUrl });
      }
    } catch (error: any) {
      console.error("File URL error:", error);
      return res.status(404).json({ error: error.message || "File not found" });
    }
  });

  // DELETE /media/:id - Delete media
  router.delete("/:id", async (req: MediaRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Media ID is required" });
      }

      await req.mediaLibrary!.remove(id);

      return res.status(204).send();
    } catch (error: any) {
      console.error("Delete error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to delete media" });
    }
  });

  return router;
}

export const mediaRouter = createMediaRouter();
