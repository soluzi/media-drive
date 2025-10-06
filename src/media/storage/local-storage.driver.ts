import fs from "fs/promises";
import path from "path";
import { StorageDriver, StoredObject, PutOptions } from "../../types";
import { getLocalConfig } from "../config";

export class LocalStorageDriver implements StorageDriver {
  private config = getLocalConfig();

  async put(
    filePath: string,
    contents: Buffer | string,
    _options?: PutOptions
  ): Promise<StoredObject> {
    const fullPath = path.join(this.config.root, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, contents);

    // Get file stats
    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.config.root, filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.config.root, filePath);
    await fs.unlink(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.config.root, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  url(filePath: string): string {
    return `${this.config.public_base_url}/${filePath}`;
  }

  async temporaryUrl(
    filePath: string,
    _expiresIn: number = 3600
  ): Promise<string> {
    // For local storage, temporary URLs are the same as regular URLs
    // In a real implementation, you might want to implement signed URLs
    // or use a different approach for temporary access
    return this.url(filePath);
  }
}
