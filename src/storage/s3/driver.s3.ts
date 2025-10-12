/**
 * S3 Storage Driver
 *
 * Implements file storage on AWS S3 or S3-compatible services
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

export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private root: string;
  private publicUrl: string | undefined;

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

  private getFullPath(path: string): string {
    if (this.root) {
      return `${this.root}/${path}`;
    }
    return path;
  }

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

  url(path: string): string {
    const fullPath = this.getFullPath(path);

    if (this.publicUrl) {
      return `${this.publicUrl}/${fullPath}`;
    }

    // Default S3 URL format
    return `https://${this.bucket}.s3.amazonaws.com/${fullPath}`;
  }

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
