import { Queue, Job } from "bullmq";
import { ConversionJobData, JobOptions, JobProgress } from "./types";

export class MediaQueue {
  private queue: Queue;

  constructor(
    private redisConnection: any,
    private queueName: string = "media-conversions"
  ) {
    this.queue = new Queue(this.queueName, {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }

  async addConversionJob(
    data: ConversionJobData,
    options?: JobOptions
  ): Promise<Job<ConversionJobData>> {
    const jobOptions = {
      ...this.queue.defaultJobOptions,
      ...options,
    };

    return await this.queue.add("process-conversion", data, jobOptions);
  }

  async getJob(jobId: string): Promise<Job<ConversionJobData> | undefined> {
    return await this.queue.getJob(jobId);
  }

  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    const job = await this.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.id!,
      progress: typeof job.progress === "number" ? job.progress : 0,
      status: (await job.getState()) as any,
      data: job.data,
      error: job.failedReason,
    };
  }

  async getJobsByStatus(
    status: "waiting" | "active" | "completed" | "failed" | "delayed",
    start: number = 0,
    end: number = -1
  ): Promise<Job<ConversionJobData>[]> {
    switch (status) {
      case "waiting":
        return await this.queue.getWaiting(start, end);
      case "active":
        return await this.queue.getActive(start, end);
      case "completed":
        return await this.queue.getCompleted(start, end);
      case "failed":
        return await this.queue.getFailed(start, end);
      case "delayed":
        return await this.queue.getDelayed(start, end);
      default:
        return [];
    }
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }

  async clean(
    grace: number = 0,
    status?: string,
    limit?: number
  ): Promise<any[]> {
    return await this.queue.clean(grace, status as any, limit as any);
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  getQueue(): Queue {
    return this.queue;
  }
}

export function createMediaQueue(
  redisConnection: any,
  queueName?: string
): MediaQueue {
  return new MediaQueue(redisConnection, queueName);
}
