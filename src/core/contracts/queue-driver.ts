/**
 * Queue Driver Contract
 *
 * Defines the interface for async job processing systems (BullMQ, in-memory, etc.)
 * Implementations handle background job queuing and status tracking for image conversions.
 */

import { ConversionOptions } from "./conversion-processor";

/**
 * Status of a queued job.
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

/**
 * Information about a queued job's current state.
 */
export interface JobInfo {
  /** Unique job identifier. */
  id: string;
  /** Current job status. */
  status: JobStatus;
  /** Progress percentage (0-100) if available. */
  progress?: number | undefined;
  /** Job result data if completed successfully. */
  result?: unknown;
  /** Error message if job failed. */
  error?: string | undefined;
}

/**
 * Statistics about the queue's current state.
 */
export interface QueueStats {
  /** Number of jobs waiting to be processed. */
  waiting: number;
  /** Number of jobs currently being processed. */
  active: number;
  /** Number of successfully completed jobs. */
  completed: number;
  /** Number of failed jobs. */
  failed: number;
}

/**
 * Data payload for a conversion job.
 */
export interface ConversionJobData {
  /** Media record ID to process. */
  mediaId: string;
  /** Map of conversion names to their options. */
  conversions: Record<string, ConversionOptions>;
  /** Original file path in storage. */
  originalPath: string;
  /** Model type (e.g., "User", "Post"). */
  modelType: string;
  /** Model instance ID. */
  modelId: string;
  /** Collection name. */
  collectionName: string;
  /** Original filename. */
  fileName: string;
  /** Storage disk name. */
  disk: string;
}

/**
 * Queue driver interface for async job processing.
 * Implementations handle job queuing, status tracking, and statistics.
 */
export interface QueueDriver {
  /**
   * Enqueue a conversion job for background processing.
   *
   * @param data - Conversion job data payload.
   * @returns Promise resolving to job ID for tracking.
   * @throws {QueueError} If enqueue operation fails.
   */
  enqueue(data: ConversionJobData): Promise<string>;

  /**
   * Get job status and progress information.
   *
   * @param jobId - Job identifier to query.
   * @returns Promise resolving to job information.
   * @throws {QueueError} If job lookup fails.
   */
  status(jobId: string): Promise<JobInfo>;

  /**
   * Get queue statistics (waiting, active, completed, failed counts).
   *
   * @returns Promise resolving to queue statistics.
   */
  stats(): Promise<QueueStats>;

  /**
   * Close/cleanup the queue connection.
   * Should be called during application shutdown.
   *
   * @returns Promise that resolves when cleanup is complete.
   */
  close(): Promise<void>;
}
