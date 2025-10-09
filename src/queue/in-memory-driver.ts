/**
 * In-Memory Queue Driver
 *
 * Simple in-memory queue for testing or single-process environments
 */

import {
  QueueDriver,
  JobInfo,
  QueueStats,
  ConversionJobData,
} from "../core/contracts";
import { QueueError } from "../core/errors";
import { getLogger } from "../core/logger";

const logger = getLogger();

interface StoredJob {
  id: string;
  data: ConversionJobData;
  status: JobInfo["status"];
  progress: number;
  result?: any;
  error?: string | undefined;
  createdAt: Date;
}

export class InMemoryQueueDriver implements QueueDriver {
  private jobs = new Map<string, StoredJob>();
  private jobCounter = 0;
  private processor: ((data: ConversionJobData) => Promise<any>) | null = null;

  constructor() {
    logger.info("In-memory queue initialized");
  }

  /**
   * Set the processor function for jobs
   */
  setProcessor(processor: (data: ConversionJobData) => Promise<any>): void {
    this.processor = processor;
  }

  async enqueue(data: ConversionJobData): Promise<string> {
    const jobId = `job_${++this.jobCounter}_${Date.now()}`;

    const job: StoredJob = {
      id: jobId,
      data,
      status: "waiting",
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    logger.debug(`Enqueued job ${jobId}`, { mediaId: data.mediaId });

    // Process immediately in background (if processor is set)
    if (this.processor) {
      this.processJob(jobId).catch((error) => {
        logger.error(`Background processing failed for job ${jobId}`, error);
      });
    }

    return jobId;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !this.processor) return;

    try {
      job.status = "active";
      job.progress = 0;

      logger.info(`Processing job ${jobId}`, { mediaId: job.data.mediaId });

      const result = await this.processor(job.data);

      job.status = "completed";
      job.progress = 100;
      job.result = result;

      logger.info(`Job ${jobId} completed`);
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";

      logger.error(`Job ${jobId} failed`, error);
    }
  }

  async status(jobId: string): Promise<JobInfo> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new QueueError(`Job ${jobId} not found`);
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
    };
  }

  async stats(): Promise<QueueStats> {
    const stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    for (const job of this.jobs.values()) {
      if (job.status === "waiting") stats.waiting++;
      else if (job.status === "active") stats.active++;
      else if (job.status === "completed") stats.completed++;
      else if (job.status === "failed") stats.failed++;
    }

    return stats;
  }

  async close(): Promise<void> {
    this.jobs.clear();
    logger.info("In-memory queue closed");
  }

  /**
   * Clear all jobs (for testing)
   */
  clear(): void {
    this.jobs.clear();
  }
}
