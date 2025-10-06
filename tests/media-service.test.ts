import { jest } from "@jest/globals";
import { MediaLibrary } from "../src/media/service";
import { PrismaClient } from "@prisma/client";

// Mock dependencies
jest.mock("../src/media/storage", () => ({
  getStorageDriver: jest.fn(),
}));

describe("MediaLibrary Service", () => {
  let mediaLibrary: MediaLibrary;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockStorageDriver: any;

  beforeEach(() => {
    mockPrisma = {
      media: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as any;

    mockStorageDriver = {
      put: jest.fn().mockResolvedValue({
        path: "test/path",
        size: 1024,
        lastModified: new Date(),
      } as never),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      url: jest.fn().mockReturnValue("https://example.com/file.jpg"),
      temporaryUrl: jest
        .fn()
        .mockResolvedValue("https://example.com/signed-url" as never),
    };

    const { getStorageDriver } = require("../src/media/storage");
    getStorageDriver.mockReturnValue(mockStorageDriver);

    mediaLibrary = new MediaLibrary(mockPrisma);
    jest.clearAllMocks();
  });

  describe("attachFile", () => {
    it("should attach file and create database record", async () => {
      const mockFile = {
        originalname: "test-image.jpg",
        buffer: Buffer.from("test-image-data"),
        size: 1024,
        mimetype: "image/jpeg",
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        name: "test-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.media.create.mockResolvedValue(mockMediaRecord);

      const result = await mediaLibrary.attachFile(
        "user",
        "user-123",
        mockFile,
        {
          collection: "avatar",
          name: "test-image.jpg",
        }
      );

      expect(mockStorageDriver.put).toHaveBeenCalledWith(
        expect.stringMatching(/^user\/user-123\/avatar\/[a-f0-9]{32}\.jpg$/),
        mockFile.buffer,
        {
          contentType: "image/jpeg",
          visibility: "public",
        }
      );

      expect(mockPrisma.media.create).toHaveBeenCalledWith({
        data: {
          model_type: "user",
          model_id: "user-123",
          collection_name: "avatar",
          name: "test-image.jpg",
          file_name: expect.stringMatching(/^[a-f0-9]{32}\.jpg$/),
          mime_type: "image/jpeg",
          disk: "local",
          size: 1024,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
        },
      });

      expect(result).toBe(mockMediaRecord);
    });

    it("should process image conversions", async () => {
      const mockFile = {
        originalname: "test-image.jpg",
        buffer: Buffer.from("test-image-data"),
        size: 1024,
        mimetype: "image/jpeg",
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      const conversions = {
        thumb: { width: 150, height: 150 },
        medium: { width: 500, height: 500 },
      };

      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        name: "test-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: conversions,
        custom_properties: {},
        responsive_images: {
          thumb: {
            path: "user/user-123/avatar/conversions/randomfilename-thumb.jpg",
            size: 512,
          },
          medium: {
            path: "user/user-123/avatar/conversions/randomfilename-medium.jpg",
            size: 800,
          },
        },
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.media.create.mockResolvedValue(mockMediaRecord);

      const result = await mediaLibrary.attachFile(
        "user",
        "user-123",
        mockFile,
        {
          collection: "avatar",
          conversions,
        }
      );

      expect(result).toBe(mockMediaRecord);
    });
  });

  describe("attachFromUrl", () => {
    it("should download file from URL and attach", async () => {
      const mockAxios = require("axios");
      mockAxios.get.mockResolvedValue({
        data: Buffer.from("downloaded-file-data"),
        headers: { "content-type": "image/png" },
      });

      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "default",
        name: "downloaded-image.png",
        file_name: "randomfilename.png",
        mime_type: "image/png",
        disk: "local",
        size: 1024,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.media.create.mockResolvedValue(mockMediaRecord);

      const result = await mediaLibrary.attachFromUrl(
        "user",
        "user-123",
        "https://example.com/image.png",
        {
          name: "downloaded-image.png",
        }
      );

      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://example.com/image.png",
        {
          responseType: "arraybuffer",
          headers: {},
          timeout: 30000,
          maxRedirects: 5,
        }
      );

      expect(result).toBe(mockMediaRecord);
    });
  });

  describe("list", () => {
    it("should list media for a model", async () => {
      const mockMediaRecords = [
        {
          id: "media-1",
          model_type: "user",
          model_id: "user-123",
          collection_name: "avatar",
          name: "avatar.jpg",
          file_name: "randomfilename.jpg",
          mime_type: "image/jpeg",
          disk: "local",
          size: 1024,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.media.findMany.mockResolvedValue(mockMediaRecords);

      const result = await mediaLibrary.list("user", "user-123");

      expect(mockPrisma.media.findMany).toHaveBeenCalledWith({
        where: {
          model_type: "user",
          model_id: "user-123",
        },
        orderBy: { order_column: "asc" },
      });

      expect(result).toBe(mockMediaRecords);
    });

    it("should filter by collection", async () => {
      await mediaLibrary.list("user", "user-123", "avatar");

      expect(mockPrisma.media.findMany).toHaveBeenCalledWith({
        where: {
          model_type: "user",
          model_id: "user-123",
          collection_name: "avatar",
        },
        orderBy: { order_column: "asc" },
      });
    });
  });

  describe("remove", () => {
    it("should delete media and files", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {},
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);
      mockPrisma.media.delete.mockResolvedValue(mockMedia);

      await mediaLibrary.remove("media-123");

      expect(mockPrisma.media.findUnique).toHaveBeenCalledWith({
        where: { id: "media-123" },
      });

      expect(mockStorageDriver.delete).toHaveBeenCalledWith(
        "user/user-123/avatar/test.jpg"
      );

      expect(mockPrisma.media.delete).toHaveBeenCalledWith({
        where: { id: "media-123" },
      });
    });

    it("should delete conversions if they exist", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {
          thumb: { path: "user/user-123/avatar/conversions/test-thumb.jpg" },
          medium: { path: "user/user-123/avatar/conversions/test-medium.jpg" },
        },
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);
      mockPrisma.media.delete.mockResolvedValue(mockMedia);

      await mediaLibrary.remove("media-123");

      expect(mockStorageDriver.delete).toHaveBeenCalledWith(
        "user/user-123/avatar/conversions/test-thumb.jpg"
      );
      expect(mockStorageDriver.delete).toHaveBeenCalledWith(
        "user/user-123/avatar/conversions/test-medium.jpg"
      );
    });

    it("should throw error if media not found", async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(mediaLibrary.remove("nonexistent")).rejects.toThrow(
        "Media with ID nonexistent not found"
      );
    });
  });

  describe("resolveFileUrl", () => {
    it("should return URL for original file", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {},
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);

      const result = await mediaLibrary.resolveFileUrl("media-123");

      expect(mockStorageDriver.url).toHaveBeenCalledWith(
        "user/user-123/avatar/test.jpg"
      );
      expect(result).toBe("https://example.com/file.jpg");
    });

    it("should return URL for conversion", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {
          thumb: { path: "user/user-123/avatar/conversions/test-thumb.jpg" },
        },
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);

      const result = await mediaLibrary.resolveFileUrl("media-123", "thumb");

      expect(mockStorageDriver.url).toHaveBeenCalledWith(
        "user/user-123/avatar/conversions/test-thumb.jpg"
      );
      expect(result).toBe("https://example.com/file.jpg");
    });

    it("should return signed URL when requested", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {},
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);

      const result = await mediaLibrary.resolveFileUrl(
        "media-123",
        undefined,
        true
      );

      expect(mockStorageDriver.temporaryUrl).toHaveBeenCalledWith(
        "user/user-123/avatar/test.jpg",
        3600
      );
      expect(result).toBe("https://example.com/signed-url");
    });

    it("should throw error if conversion not found", async () => {
      const mockMedia = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        file_name: "test.jpg",
        disk: "local",
        responsive_images: {},
      };

      mockPrisma.media.findUnique.mockResolvedValue(mockMedia);

      await expect(
        mediaLibrary.resolveFileUrl("media-123", "nonexistent")
      ).rejects.toThrow(
        "Conversion 'nonexistent' not found for media media-123"
      );
    });

    it("should throw error if media not found", async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(mediaLibrary.resolveFileUrl("nonexistent")).rejects.toThrow(
        "Media with ID nonexistent not found"
      );
    });
  });
});
