/**
 * Queue Driver Contract
 *
 * Defines the interface for async job processing systems (BullMQ, in-memory, etc.)
 */

import { ConversionOptions } from "./conversion-processor";

export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

export interface JobInfo {
  id: string;
  status: JobStatus;
  progress?: number | undefined;
  result?: unknown;
  error?: string | undefined;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface ConversionJobData {
  mediaId: string;
  conversions: Record<string, ConversionOptions>;
  originalPath: string;
  modelType: string;
  modelId: string;
  collectionName: string;
  fileName: string;
  disk: string;
}

export interface QueueDriver {
  /**
   * Enqueue a conversion job
   *
   * @returns Job ID for tracking
   */
  enqueue(data: ConversionJobData): Promise<string>;

  /**
   * Get job status and progress
   */
  status(jobId: string): Promise<JobInfo>;

  /**
   * Get queue statistics
   */
  stats(): Promise<QueueStats>;

  /**
   * Close/cleanup the queue connection
   */
  close(): Promise<void>;
}
