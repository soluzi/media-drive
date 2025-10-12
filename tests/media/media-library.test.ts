/**
 * MediaLibrary Integration Tests
 */

import { PrismaClient } from "@prisma/client";
import { createMediaLibrary } from "../../src/factory";
import { MediaLibrary } from "../../src/media/media-library";
import { MockPrismaClient } from "../__mocks__/mock-prisma.client";
import { MockStorageDriver } from "../__mocks__/mock-storage.driver";
import { InMemoryQueueDriver } from "../../src/queue/in-memory-driver";
import { Readable } from "stream";

describe("MediaLibrary", () => {
  let mediaLibrary: MediaLibrary;
  let mockPrisma: MockPrismaClient;
  let mockStorage: MockStorageDriver;

  beforeEach(() => {
    mockPrisma = new MockPrismaClient();
    mockStorage = new MockStorageDriver();

    mediaLibrary = createMediaLibrary({
      config: {
        disk: "mock",
        pathGeneration: {
          strategy: "simple",
        },
        security: {
          allowedMime: ["image/jpeg", "image/png", "image/webp"],
          forbiddenMime: [],
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
        },
      },
      prisma: mockPrisma as unknown as PrismaClient,
      providers: {
        storageDriver: mockStorage,
        queueDriver: new InMemoryQueueDriver(),
      },
    });
  });

  afterEach(() => {
    mockPrisma.clear();
    mockStorage.clear();
  });

  describe("attachFile", () => {
    it("should attach a file", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test image data"),
        size: 15,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await mediaLibrary.attachFile("User", "123", file, {
        collection: "avatar",
      });

      expect(result).toBeDefined();
      expect(result.model_type).toBe("User");
      expect(result.model_id).toBe("123");
      expect(result.collection_name).toBe("avatar");
      expect(result.mime_type).toBe("image/jpeg");
      expect(result.size).toBe(15);
    });

    it("should store file in storage", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test image data"),
        size: 15,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      await mediaLibrary.attachFile("User", "123", file);

      const files = mockStorage.getFiles();
      expect(files.size).toBeGreaterThan(0);
    });

    it("should use custom collection", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await mediaLibrary.attachFile("Post", "456", file, {
        collection: "featured",
      });

      expect(result.collection_name).toBe("featured");
    });
  });

  describe("list", () => {
    it("should list media for a model", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      await mediaLibrary.attachFile("User", "123", file);
      await mediaLibrary.attachFile("User", "123", file);

      const results = await mediaLibrary.list("User", "123");

      expect(results).toHaveLength(2);
      expect(results[0].model_type).toBe("User");
      expect(results[0].model_id).toBe("123");
    });

    it("should filter by collection", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      await mediaLibrary.attachFile("User", "123", file, {
        collection: "avatar",
      });
      await mediaLibrary.attachFile("User", "123", file, {
        collection: "photos",
      });

      const avatars = await mediaLibrary.list("User", "123", "avatar");
      expect(avatars).toHaveLength(1);
      expect(avatars[0].collection_name).toBe("avatar");
    });
  });

  describe("remove", () => {
    it("should remove media", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await mediaLibrary.attachFile("User", "123", file);
      await mediaLibrary.remove(result.id);

      const media = await mockPrisma.media.findUnique({
        where: { id: result.id },
      });

      expect(media).toBeNull();
    });
  });

  describe("resolveFileUrl", () => {
    it("should resolve file URL", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await mediaLibrary.attachFile("User", "123", file);
      const url = await mediaLibrary.resolveFileUrl(result.id);

      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });

    it("should generate signed URL", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 4,
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await mediaLibrary.attachFile("User", "123", file);
      const url = await mediaLibrary.resolveFileUrl(result.id, undefined, true);

      expect(url).toContain("signed=true");
    });
  });
});
