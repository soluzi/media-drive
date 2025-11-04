/**
 * MediaLibrary Integration Tests
 */

import { PrismaClient } from "@prisma/client";
import { createMediaLibrary } from "../../src/factory";
import { MediaLibrary } from "../../src/media/media-library";
import { MockPrismaClient } from "../__mocks__/mock-prisma.client";
import { MockStorageDriver } from "../__mocks__/mock-storage.driver";
import { InMemoryQueueDriver } from "../../src/queue/in-memory-driver";
import { ConfigurationError } from "../../src/core/errors";
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

    it("should use default disk when no disk specified", async () => {
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

      expect(result.disk).toBe("mock");
    });
  });

  describe("getStorageDriver (via attachFile)", () => {
    let mediaLibraryWithMultipleDisks: MediaLibrary;

    beforeEach(() => {
      mockPrisma = new MockPrismaClient();

      // Create media library with multiple disks configured
      mediaLibraryWithMultipleDisks = createMediaLibrary({
        config: {
          disk: "local",
          disks: {
            local: {
              driver: "local",
              root: "storage/public",
              public_base_url: "http://localhost:3000/media",
            },
            temp: {
              driver: "local",
              root: "storage/temp",
              public_base_url: "http://localhost:3000/media",
            },
          },
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
          queueDriver: new InMemoryQueueDriver(),
        },
      });
    });

    afterEach(() => {
      mockPrisma.clear();
    });

    it("should use specified disk when disk option provided", async () => {
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

      const result = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "123",
        file,
        {
          disk: "temp",
        }
      );

      expect(result.disk).toBe("temp");
      expect(result.model_type).toBe("User");
      expect(result.model_id).toBe("123");
    });

    it("should use default disk when disk not specified", async () => {
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

      const result = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "123",
        file
      );

      expect(result.disk).toBe("local");
    });

    it("should throw ConfigurationError for invalid disk", async () => {
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

      await expect(
        mediaLibraryWithMultipleDisks.attachFile("User", "123", file, {
          disk: "invalid-disk",
        })
      ).rejects.toThrow(ConfigurationError);

      await expect(
        mediaLibraryWithMultipleDisks.attachFile("User", "123", file, {
          disk: "invalid-disk",
        })
      ).rejects.toThrow("Disk configuration not found: invalid-disk");
    });

    it("should cache storage drivers for same disk", async () => {
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

      // First call should create and cache the driver
      const result1 = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "123",
        file,
        {
          disk: "temp",
        }
      );

      // Second call should use cached driver
      const result2 = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "456",
        file,
        {
          disk: "temp",
        }
      );

      expect(result1.disk).toBe("temp");
      expect(result2.disk).toBe("temp");
      // Both should succeed without errors (caching works)
    });

    it("should use different drivers for different disks", async () => {
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

      const localResult = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "123",
        file,
        {
          disk: "local",
        }
      );

      const tempResult = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "456",
        file,
        {
          disk: "temp",
        }
      );

      expect(localResult.disk).toBe("local");
      expect(tempResult.disk).toBe("temp");
      expect(localResult.disk).not.toBe(tempResult.disk);
    });

    it("should save disk field correctly in database record", async () => {
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

      const result = await mediaLibraryWithMultipleDisks.attachFile(
        "User",
        "123",
        file,
        {
          disk: "temp",
        }
      );

      // Verify the disk was saved in the database record
      const savedRecord = await mockPrisma.media.findUnique({
        where: { id: result.id },
      });

      expect(savedRecord).toBeDefined();
      expect(savedRecord?.disk).toBe("temp");
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
