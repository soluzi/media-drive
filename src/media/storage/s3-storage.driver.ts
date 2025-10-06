import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageDriver, StoredObject, PutOptions } from "../../types";
import { getS3Config } from "../config";

export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private config = getS3Config()!;

  constructor() {
    const clientConfig: any = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.key,
        secretAccessKey: this.config.secret,
      },
      forcePathStyle: this.config.use_path_style_endpoint,
    };

    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    this.client = new S3Client(clientConfig);
  }

  async put(
    filePath: string,
    contents: Buffer | string,
    options?: PutOptions
  ): Promise<StoredObject> {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: contents,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
      ACL: options?.visibility === "public" ? "public-read" : "private",
    });

    await this.client.send(command);

    // Get object metadata
    const headCommand = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const headResult = await this.client.send(headCommand);

    return {
      path: filePath,
      size: headResult.ContentLength || 0,
      lastModified: headResult.LastModified || undefined,
      etag: headResult.ETag || undefined,
    };
  }

  async get(filePath: string): Promise<Buffer> {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error("No body in S3 response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async delete(filePath: string): Promise<void> {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async exists(filePath: string): Promise<boolean> {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  url(filePath: string): string {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    if (this.config.url) {
      return `${this.config.url}/${key}`;
    }

    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async temporaryUrl(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const key = this.config.root ? `${this.config.root}/${filePath}` : filePath;

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }
}
