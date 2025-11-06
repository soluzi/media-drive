/**
 * S3 Storage Driver
 *
 * Implements file storage on AWS S3 or S3-compatible services.
 * Uses AWS SDK v3 for S3 operations and supports custom endpoints for S3-compatible services.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageDriver, PutOptions, StoredObject } from "../../core/contracts";
import { StorageError } from "../../core/errors";
import { S3Disk } from "../../config/schema";

/**
 * Amazon S3 storage driver implementation.
 * Stores files on AWS S3 or S3-compatible services (e.g., DigitalOcean Spaces, MinIO).
 * Supports custom endpoints, path-style URLs, and signed URLs for private files.
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private root: string;
  private publicUrl: string | undefined;

  /**
   * Creates a new S3StorageDriver instance.
   *
   * @param config - S3 disk configuration with credentials, bucket, and optional settings.
   */
  constructor(config: S3Disk) {
    const clientConfig: {
      region: string;
      credentials: {
        accessKeyId: string;
        secretAccessKey: string;
      };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {
      region: config.region,
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret,
      },
    };

    // Only add optional properties if they're defined
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }
    if (config.use_path_style_endpoint !== undefined) {
      clientConfig.forcePathStyle = config.use_path_style_endpoint;
    }

    this.client = new S3Client(clientConfig);

    this.bucket = config.bucket;
    this.root = config.root || "";
    this.publicUrl = config.url;
  }

  /**
   * Get full S3 key path including root prefix.
   *
   * @param path - Relative storage path.
   * @returns Full S3 key path with root prefix if configured.
   */
  private getFullPath(path: string): string {
    if (this.root) {
      return `${this.root}/${path}`;
    }
    return path;
  }

  /**
   * Store a file on S3.
   * Uploads file contents to the configured S3 bucket with optional metadata and ACL settings.
   *
   * @param path - Relative storage path where the file should be stored.
   * @param contents - File contents as Buffer or string.
   * @param opts - Optional storage options (content type, visibility, metadata).
   * @returns Promise resolving to stored object information with ETag.
   * @throws {StorageError} If S3 upload operation fails.
   */
  async put(
    path: string,
    contents: Buffer | string,
    opts?: PutOptions | undefined
  ): Promise<StoredObject> {
    try {
      const fullPath = this.getFullPath(path);
      const buffer =
        typeof contents === "string" ? Buffer.from(contents) : contents;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
        Body: buffer,
        ContentType: opts?.contentType,
        Metadata: opts?.metadata,
        ACL: opts?.visibility === "public" ? "public-read" : "private",
      });

      const response = await this.client.send(command);

      return {
        path,
        size: buffer.length,
        etag: response.ETag,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to store file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieve file contents from S3.
   * Downloads the file and converts the stream to a Buffer.
   *
   * @param path - Relative storage path of the file to retrieve.
   * @returns Promise resolving to file contents as Buffer.
   * @throws {StorageError} If file doesn't exist or retrieval fails.
   */
  async get(path: string): Promise<Buffer> {
    try {
      const fullPath = this.getFullPath(path);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new StorageError(`No data received for ${path}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const body = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new StorageError(
        `Failed to read file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a file from S3.
   *
   * @param path - Relative storage path of the file to delete.
   * @returns Promise that resolves when deletion is complete.
   * @throws {StorageError} If deletion fails.
   */
  async delete(path: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(path);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
      });

      await this.client.send(command);
    } catch (error) {
      throw new StorageError(
        `Failed to delete file at ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if a file exists in S3.
   * Uses HeadObject to check existence without downloading the file.
   *
   * @param path - Relative storage path to check.
   * @returns Promise resolving to true if file exists, false otherwise.
   */
  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(path);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for a file.
   * Returns custom URL if configured, otherwise uses default S3 URL format.
   *
   * @param path - Relative storage path of the file.
   * @returns Public URL string.
   */
  url(path: string): string {
    const fullPath = this.getFullPath(path);

    if (this.publicUrl) {
      return `${this.publicUrl}/${fullPath}`;
    }

    // Default S3 URL format
    return `https://${this.bucket}.s3.amazonaws.com/${fullPath}`;
  }

  /**
   * Generate a temporary signed URL with expiration.
   * Creates a presigned URL that allows temporary access to private files.
   *
   * @param path - Relative storage path of the file.
   * @param expiresInSec - Expiration time in seconds (default: 3600 = 1 hour).
   * @returns Promise resolving to signed URL string.
   * @throws {StorageError} If signed URL generation fails.
   */
  async temporaryUrl(
    path: string,
    expiresInSec: number = 3600
  ): Promise<string> {
    try {
      const fullPath = this.getFullPath(path);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: expiresInSec,
      });
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
