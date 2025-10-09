/**
 * BullMQ Queue Driver
 *
 * Implements async job processing with BullMQ and Redis
 */

import { Queue, Worker, Job } from "bullmq";
import {
  QueueDriver,
  JobInfo,
  QueueStats,
  ConversionJobData,
} from "../core/contracts";
import { QueueError } from "../core/errors";
import { getLogger } from "../core/logger";

const logger = getLogger();

export interface BullMQConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string | undefined;
    db?: number | undefined;
  };
}

export class BullMQDriver implements QueueDriver {
  private queue: Queue;
  private worker: Worker | null = null;
  private connectionOptions: any;

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
   * Initialize worker to process jobs
   */
  initWorker(processor: (data: ConversionJobData) => Promise<any>): void {
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
      logger.error(`Job ${job?.id} failed`, error);
    });

    logger.info("BullMQ worker started");
  }

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
        status: state as any,
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

  async close(): Promise<void> {
    await Promise.all([this.queue.close(), this.worker?.close()]);
    logger.info("BullMQ driver closed");
  }
}
