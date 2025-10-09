/**
 * Mock Storage Driver for Testing
 */

import {
  StorageDriver,
  PutOptions,
  StoredObject,
} from "../../src/core/contracts";

export class MockStorageDriver implements StorageDriver {
  private files = new Map<string, Buffer>();

  async put(
    path: string,
    contents: Buffer | string,
    _opts?: PutOptions
  ): Promise<StoredObject> {
    const buffer =
      typeof contents === "string" ? Buffer.from(contents) : contents;
    this.files.set(path, buffer);

    return {
      path,
      size: buffer.length,
      etag: `mock-etag-${path}`,
    };
  }

  async get(path: string): Promise<Buffer> {
    const buffer = this.files.get(path);
    if (!buffer) {
      throw new Error(`File not found: ${path}`);
    }
    return buffer;
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  url(path: string): string {
    return `http://mock-storage/${path}`;
  }

  async temporaryUrl(path: string, _expiresInSec?: number): Promise<string> {
    return `http://mock-storage/${path}?signed=true&expires=${Date.now()}`;
  }

  clear(): void {
    this.files.clear();
  }

  getFiles(): Map<string, Buffer> {
    return this.files;
  }
}
