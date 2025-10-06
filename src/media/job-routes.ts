import { Router, Request, Response } from "express";
import { MediaLibrary } from "./service";
import { MediaQueue } from "./jobs";

export function createJobRoutes(
  mediaLibrary: MediaLibrary,
  mediaQueue: MediaQueue
): Router {
  const router = Router();

  // POST /media/:id/convert - Start async conversion
  router.post("/:id/convert", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { conversions } = req.body;

      if (!conversions || typeof conversions !== "object") {
        return res.status(400).json({
          error: "conversions object is required",
        });
      }

      if (!id) {
        return res.status(400).json({
          error: "Media ID is required",
        });
      }

      const jobId = await mediaLibrary.processConversionsAsync(id, conversions);
      if (!jobId) {
        return res.status(500).json({
          error: "Failed to create conversion job",
        });
      }

      return res.status(202).json({
        jobId,
        message: "Conversion job started",
      });
    } catch (error) {
      console.error("Conversion job error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /media/jobs/:jobId/status - Get job status
  router.get("/jobs/:jobId/status", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      if (!jobId) {
        return res.status(400).json({
          error: "Job ID is required",
        });
      }

      const status = await mediaLibrary.getConversionJobStatus(jobId);
      if (!status) {
        return res.status(404).json({
          error: "Job not found",
        });
      }

      return res.json(status);
    } catch (error) {
      console.error("Job status error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /media/jobs/stats - Get queue statistics
  router.get("/jobs/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await mediaLibrary.getQueueStats();
      return res.json(stats);
    } catch (error) {
      console.error("Queue stats error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /media/jobs - List jobs by status
  router.get("/jobs", async (req: Request, res: Response) => {
    try {
      const { status = "waiting", start = 0, end = -1 } = req.query;

      const jobs = await mediaQueue.getJobsByStatus(
        status as any,
        parseInt(start as string),
        parseInt(end as string)
      );

      const jobList = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        state: "unknown", // BullMQ doesn't expose state directly
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn,
        failedReason: job.failedReason,
      }));

      return res.json(jobList);
    } catch (error) {
      console.error("List jobs error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /media/jobs/pause - Pause queue
  router.post("/jobs/pause", async (_req: Request, res: Response) => {
    try {
      await mediaQueue.pause();
      return res.json({ message: "Queue paused" });
    } catch (error) {
      console.error("Pause queue error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /media/jobs/resume - Resume queue
  router.post("/jobs/resume", async (_req: Request, res: Response) => {
    try {
      await mediaQueue.resume();
      return res.json({ message: "Queue resumed" });
    } catch (error) {
      console.error("Resume queue error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // DELETE /media/jobs/clean - Clean completed/failed jobs
  router.delete("/jobs/clean", async (req: Request, res: Response) => {
    try {
      const { grace = 0, status, limit } = req.query;

      const cleanedJobs = await mediaQueue.clean(
        parseInt(grace as string),
        status as string,
        limit ? parseInt(limit as string) : undefined
      );

      return res.json({
        message: `${cleanedJobs.length} jobs cleaned`,
        cleanedCount: cleanedJobs.length,
      });
    } catch (error) {
      console.error("Clean jobs error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
