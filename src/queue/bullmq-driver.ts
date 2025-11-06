/**
 * BullMQ Queue Driver
 *
 * Implements async job processing with BullMQ and Redis.
 * Provides production-ready queue functionality with retries, backoff, and job persistence.
 * Requires Redis server for job storage and coordination.
 */

import { Queue, Worker, Job, ConnectionOptions } from "bullmq";
import {
  QueueDriver,
  JobInfo,
  JobStatus,
  QueueStats,
  ConversionJobData,
} from "../core/contracts";
import { QueueError } from "../core/errors";
import { getLogger } from "../core/logger";

const logger = getLogger();

/**
 * Configuration for BullMQ queue driver.
 */
export interface BullMQConfig {
  /** Queue name (used as Redis key prefix). */
  name: string;
  /** Redis connection configuration. */
  redis: {
    /** Redis server hostname. */
    host: string;
    /** Redis server port. */
    port: number;
    /** Optional Redis password for authentication. */
    password?: string | undefined;
    /** Optional Redis database number (default: 0). */
    db?: number | undefined;
  };
}

/**
 * BullMQ queue driver implementation.
 * Uses BullMQ library for Redis-based job queuing with advanced features:
 * - Automatic retries with exponential backoff
 * - Job persistence in Redis
 * - Worker process management
 * - Job progress tracking
 * - Queue statistics
 *
 * Suitable for production multi-process deployments.
 */
export class BullMQDriver implements QueueDriver {
  private queue: Queue;
  private worker: Worker | null = null;
  private connectionOptions: ConnectionOptions;

  /**
   * Creates a new BullMQDriver instance.
   * Initializes the queue but does not start a worker (call initWorker() separately).
   *
   * @param config - BullMQ configuration with queue name and Redis connection details.
   */
  constructor(config: BullMQConfig) {
    // Build connection options, omitting undefined values
    this.connectionOptions = {
      host: config.redis.host,
      port: config.redis.port,
      ...(config.redis.password ? { password: config.redis.password } : {}),
      ...(config.redis.db !== undefined ? { db: config.redis.db } : {}),
    };

    this.queue = new Queue(config.name, {
      connection: this.connectionOptions,
    });

    logger.info(`BullMQ queue initialized: ${config.name}`);
  }

  /**
   * Initialize worker to process jobs.
   * Sets up a BullMQ worker that will process jobs from the queue.
   * Can only be called once per instance (subsequent calls are ignored).
   *
   * The worker automatically:
   * - Processes jobs from the queue
   * - Handles retries on failure
   * - Logs job completion and failures
   *
   * @param processor - Function that processes conversion job data.
   *   Should return a result or throw an error on failure.
   */
  initWorker(processor: (data: ConversionJobData) => Promise<unknown>): void {
    if (this.worker) {
      logger.warn("Worker already initialized");
      return;
    }

    this.worker = new Worker(
      this.queue.name,
      async (job: Job<ConversionJobData>) => {
        logger.info(`Processing job ${job.id}`, { mediaId: job.data.mediaId });
        return await processor(job.data);
      },
      {
        connection: this.connectionOptions,
      }
    );

    this.worker.on("completed", (job) => {
      logger.info(`Job ${job.id} completed`);
    });

    this.worker.on("failed", (job, error) => {
      logger.error(
        `Job ${job?.id} failed`,
        error instanceof Error ? { message: error.message } : undefined
      );
    });

    logger.info("BullMQ worker started");
  }

  /**
   * Enqueue a conversion job for background processing.
   * Jobs are configured with:
   * - 3 retry attempts
   * - Exponential backoff starting at 2 seconds
   * - Automatic cleanup (keeps last 100 completed, 50 failed)
   *
   * @param data - Conversion job data payload.
   * @returns Promise resolving to job ID for tracking.
   * @throws {QueueError} If enqueue operation fails.
   */
  async enqueue(data: ConversionJobData): Promise<string> {
    try {
      const job = await this.queue.add("conversion", data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      if (!job.id) {
        throw new QueueError("Failed to create job: no job ID returned");
      }

      logger.debug(`Enqueued job ${job.id}`, { mediaId: data.mediaId });
      return job.id;
    } catch (error) {
      throw new QueueError(
        `Failed to enqueue job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get job status and progress information.
   * Retrieves current job state, progress percentage, result, and error information.
   *
   * @param jobId - Job identifier to query.
   * @returns Promise resolving to job information (status, progress, result, error).
   * @throws {QueueError} If job is not found or status lookup fails.
   */
  async status(jobId: string): Promise<JobInfo> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        throw new QueueError(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: jobId,
        status: state as JobStatus,
        progress: typeof progress === "number" ? progress : undefined,
        result: job.returnvalue,
        error: job.failedReason,
      };
    } catch (error) {
      throw new QueueError(
        `Failed to get job status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get queue statistics (waiting, active, completed, failed counts).
   * Fetches counts from Redis in parallel for efficiency.
   *
   * @returns Promise resolving to queue statistics.
   * @throws {QueueError} If statistics retrieval fails.
   */
  async stats(): Promise<QueueStats> {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
      ]);

      return { waiting, active, completed, failed };
    } catch (error) {
      throw new QueueError(
        `Failed to get queue stats: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Close/cleanup the queue connection and worker.
   * Closes both the queue and worker connections gracefully.
   * Should be called during application shutdown.
   *
   * @returns Promise that resolves when cleanup is complete.
   */
  async close(): Promise<void> {
    await Promise.all([this.queue.close(), this.worker?.close()]);
    logger.info("BullMQ driver closed");
  }
}
