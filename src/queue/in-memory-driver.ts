/**
 * In-Memory Queue Driver
 *
 * Simple in-memory queue for testing or single-process environments.
 * Processes jobs immediately in the background (no separate worker process needed).
 * Not suitable for production multi-process deployments.
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

/**
 * Internal job storage structure.
 */
interface StoredJob {
  /** Unique job identifier. */
  id: string;
  /** Job data payload. */
  data: ConversionJobData;
  /** Current job status. */
  status: JobInfo["status"];
  /** Progress percentage (0-100). */
  progress: number;
  /** Job result if completed successfully. */
  result?: unknown;
  /** Error message if job failed. */
  error?: string | undefined;
  /** Job creation timestamp. */
  createdAt: Date;
}

/**
 * In-memory queue driver implementation.
 * Stores jobs in memory and processes them immediately in the background.
 * Useful for development, testing, or single-process applications.
 */
export class InMemoryQueueDriver implements QueueDriver {
  private jobs = new Map<string, StoredJob>();
  private jobCounter = 0;
  private processor: ((data: ConversionJobData) => Promise<unknown>) | null =
    null;

  /**
   * Creates a new InMemoryQueueDriver instance.
   */
  constructor() {
    logger.info("In-memory queue initialized");
  }

  /**
   * Set the processor function for jobs.
   * The processor will be called automatically when jobs are enqueued.
   *
   * @param processor - Function that processes conversion job data.
   */
  setProcessor(processor: (data: ConversionJobData) => Promise<unknown>): void {
    this.processor = processor;
  }

  /**
   * Enqueue a conversion job for processing.
   * If a processor is set, the job will be processed immediately in the background.
   *
   * @param data - Conversion job data payload.
   * @returns Promise resolving to job ID for tracking.
   */
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

  /**
   * Internal method to process a job in the background.
   * Updates job status and progress as processing occurs.
   *
   * @param jobId - Job identifier to process.
   */
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

      logger.error(
        `Job ${jobId} failed`,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Get job status and progress information.
   *
   * @param jobId - Job identifier to query.
   * @returns Promise resolving to job information.
   * @throws {QueueError} If job is not found.
   */
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

  /**
   * Get queue statistics (waiting, active, completed, failed counts).
   *
   * @returns Promise resolving to queue statistics.
   */
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

  /**
   * Close/cleanup the queue connection.
   * Clears all jobs from memory.
   *
   * @returns Promise that resolves when cleanup is complete.
   */
  async close(): Promise<void> {
    this.jobs.clear();
    logger.info("In-memory queue closed");
  }

  /**
   * Clear all jobs from the queue.
   * Useful for testing to reset state.
   */
  clear(): void {
    this.jobs.clear();
  }
}
