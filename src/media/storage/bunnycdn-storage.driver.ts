import axios, { AxiosInstance } from "axios";
import { StorageDriver, StoredObject, PutOptions } from "../../types";
import { getBunnyCDNConfig } from "../config";

export class BunnyCDNStorageDriver implements StorageDriver {
  private client: AxiosInstance;
  private config = getBunnyCDNConfig()!;

  constructor() {
    const baseURL = `https://${
      this.config.region || "de"
    }.storage.bunnycdn.com/${this.config.storage_zone}`;

    this.client = axios.create({
      baseURL,
      headers: {
        AccessKey: this.config.api_key,
        "Content-Type": "application/octet-stream",
      },
      timeout: 30000,
    });
  }

  async put(
    filePath: string,
    contents: Buffer | string,
    options?: PutOptions
  ): Promise<StoredObject> {
    const path = this.config.root
      ? `${this.config.root}/${filePath}`
      : filePath;
    const buffer =
      typeof contents === "string" ? Buffer.from(contents) : contents;

    try {
      const response = await this.client.put(path, buffer, {
        headers: {
          "Content-Type": options?.contentType || "application/octet-stream",
          ...(options?.metadata && {
            "X-Metadata": JSON.stringify(options.metadata),
          }),
        },
      });

      // Get file info after upload
      const fileInfo = await this.getFileInfo(path);

      return {
        path: filePath,
        size: fileInfo.size,
        lastModified: fileInfo.lastModified,
        etag: response.headers["etag"],
      };
    } catch (error: any) {
      throw new Error(`Failed to upload file to BunnyCDN: ${error.message}`);
    }
  }

  async get(filePath: string): Promise<Buffer> {
    const path = this.config.root
      ? `${this.config.root}/${filePath}`
      : filePath;

    try {
      const response = await this.client.get(path, {
        responseType: "arraybuffer",
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(
        `Failed to download file from BunnyCDN: ${error.message}`
      );
    }
  }

  async delete(filePath: string): Promise<void> {
    const path = this.config.root
      ? `${this.config.root}/${filePath}`
      : filePath;

    try {
      await this.client.delete(path);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // File doesn't exist, consider it deleted
        return;
      }
      throw new Error(`Failed to delete file from BunnyCDN: ${error.message}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const path = this.config.root
      ? `${this.config.root}/${filePath}`
      : filePath;

    try {
      await this.client.head(path);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw new Error(
        `Failed to check file existence on BunnyCDN: ${error.message}`
      );
    }
  }

  url(filePath: string): string {
    const path = this.config.root
      ? `${this.config.root}/${filePath}`
      : filePath;
    return `https://${this.config.pull_zone}.b-cdn.net/${path}`;
  }

  async temporaryUrl(
    filePath: string,
    _expiresIn: number = 3600
  ): Promise<string> {
    // BunnyCDN doesn't have built-in signed URLs like S3
    // For private files, you would typically use token authentication
    // For now, we'll return the regular URL
    // In a production environment, you might want to implement token-based authentication
    return this.url(filePath);
  }

  private async getFileInfo(
    filePath: string
  ): Promise<{ size: number; lastModified?: Date }> {
    try {
      const response = await this.client.head(filePath);
      const contentLength = response.headers["content-length"];
      const lastModified = response.headers["last-modified"];

      return {
        size: contentLength ? parseInt(contentLength, 10) : 0,
        ...(lastModified && { lastModified: new Date(lastModified) }),
      };
    } catch (error: any) {
      // If we can't get file info, return default values
      return {
        size: 0,
      };
    }
  }
}
