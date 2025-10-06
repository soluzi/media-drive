import { jest } from "@jest/globals";
import { initMediaLibrary } from "../src/media/config";
import { MediaLibrary } from "../src/media/service";
import { createMediaRouter } from "../src/media/routes";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client for integration tests
const mockPrismaClient = {
  media: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
} as any;

describe("Media Library Integration Tests", () => {
  let mediaLibrary: MediaLibrary;

  beforeEach(() => {
    // Initialize media library configuration
    initMediaLibrary({
      default_disk: "local",
      local: {
        root: "test-uploads",
        public_base_url: "http://localhost:3000/uploads",
      },
    });

    mediaLibrary = new MediaLibrary(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe("End-to-End Media Workflow", () => {
    it("should handle complete media lifecycle", async () => {
      // 1. Mock file upload
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

      // Mock Prisma responses
      mockPrismaClient.media.create.mockResolvedValue(mockMediaRecord);
      mockPrismaClient.media.findUnique.mockResolvedValue(mockMediaRecord);
      mockPrismaClient.media.findMany.mockResolvedValue([mockMediaRecord]);
      mockPrismaClient.media.delete.mockResolvedValue(mockMediaRecord);

      // 2. Attach file
      const attachedMedia = await mediaLibrary.attachFile(
        "user",
        "user-123",
        mockFile,
        {
          collection: "avatar",
          name: "test-image.jpg",
        }
      );

      expect(attachedMedia).toEqual(mockMediaRecord);
      expect(mockPrismaClient.media.create).toHaveBeenCalledWith({
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

      // 3. List media
      const mediaList = await mediaLibrary.list("user", "user-123");
      expect(mediaList).toEqual([mockMediaRecord]);

      // 4. Get file URL
      const fileUrl = await mediaLibrary.resolveFileUrl("media-123");
      expect(fileUrl).toMatch(
        /^http:\/\/localhost:3000\/uploads\/user\/user-123\/avatar\/[a-f0-9]{32}\.jpg$/
      );

      // 5. Remove media
      await mediaLibrary.remove("media-123");
      expect(mockPrismaClient.media.delete).toHaveBeenCalledWith({
        where: { id: "media-123" },
      });
    });

    it("should handle image conversions workflow", async () => {
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
        collection_name: "gallery",
        name: "test-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: conversions,
        custom_properties: {},
        responsive_images: {
          thumb: {
            path: "user/user-123/gallery/conversions/randomfilename-thumb.jpg",
            size: 512,
          },
          medium: {
            path: "user/user-123/gallery/conversions/randomfilename-medium.jpg",
            size: 800,
          },
        },
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaClient.media.create.mockResolvedValue(mockMediaRecord);
      mockPrismaClient.media.findUnique.mockResolvedValue(mockMediaRecord);

      // Attach file with conversions
      const attachedMedia = await mediaLibrary.attachFile(
        "user",
        "user-123",
        mockFile,
        {
          collection: "gallery",
          conversions,
        }
      );

      expect(attachedMedia.manipulations).toEqual(conversions);
      expect(attachedMedia.responsive_images).toEqual({
        thumb: {
          path: "user/user-123/gallery/conversions/randomfilename-thumb.jpg",
          size: 512,
        },
        medium: {
          path: "user/user-123/gallery/conversions/randomfilename-medium.jpg",
          size: 800,
        },
      });

      // Get conversion URL
      const thumbUrl = await mediaLibrary.resolveFileUrl("media-123", "thumb");
      expect(thumbUrl).toMatch(
        /^http:\/\/localhost:3000\/uploads\/user\/user-123\/gallery\/conversions\/randomfilename-thumb\.jpg$/
      );

      const mediumUrl = await mediaLibrary.resolveFileUrl(
        "media-123",
        "medium"
      );
      expect(mediumUrl).toMatch(
        /^http:\/\/localhost:3000\/uploads\/user\/user-123\/gallery\/conversions\/randomfilename-medium\.jpg$/
      );
    });

    it("should handle URL attachment workflow", async () => {
      const mockAxios = require("axios");
      mockAxios.get.mockResolvedValue({
        data: Buffer.from("downloaded-file-data"),
        headers: { "content-type": "image/png" },
      });

      const mockMediaRecord = {
        id: "media-456",
        model_type: "product",
        model_id: "product-789",
        collection_name: "images",
        name: "product-image.png",
        file_name: "randomfilename.png",
        mime_type: "image/png",
        disk: "local",
        size: 2048,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaClient.media.create.mockResolvedValue(mockMediaRecord);

      // Attach from URL
      const attachedMedia = await mediaLibrary.attachFromUrl(
        "product",
        "product-789",
        "https://example.com/product-image.png",
        {
          collection: "images",
          name: "product-image.png",
        }
      );

      expect(attachedMedia).toEqual(mockMediaRecord);
      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://example.com/product-image.png",
        {
          responseType: "arraybuffer",
          headers: {},
          timeout: 30000,
          maxRedirects: 5,
        }
      );

      expect(mockPrismaClient.media.create).toHaveBeenCalledWith({
        data: {
          model_type: "product",
          model_id: "product-789",
          collection_name: "images",
          name: "product-image.png",
          file_name: expect.stringMatching(/^[a-f0-9]{32}\.png$/),
          mime_type: "image/png",
          disk: "local",
          size: 2048,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
        },
      });
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle storage errors gracefully", async () => {
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

      // Mock storage error
      const { getStorageDriver } = require("../src/media/storage");
      const mockStorageDriver = getStorageDriver();
      mockStorageDriver.put.mockRejectedValue(
        new Error("Storage write failed")
      );

      await expect(
        mediaLibrary.attachFile("user", "user-123", mockFile)
      ).rejects.toThrow("Storage write failed");
    });

    it("should handle database errors gracefully", async () => {
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

      // Mock database error
      mockPrismaClient.media.create.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        mediaLibrary.attachFile("user", "user-123", mockFile)
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle file not found errors", async () => {
      mockPrismaClient.media.findUnique.mockResolvedValue(null);

      await expect(mediaLibrary.resolveFileUrl("nonexistent")).rejects.toThrow(
        "Media with ID nonexistent not found"
      );

      await expect(mediaLibrary.remove("nonexistent")).rejects.toThrow(
        "Media with ID nonexistent not found"
      );
    });
  });

  describe("Configuration Integration", () => {
    it("should work with S3 configuration", async () => {
      // Re-initialize with S3 config
      initMediaLibrary({
        default_disk: "s3",
        local: {
          root: "uploads",
          public_base_url: "http://localhost:3000/uploads",
        },
        s3: {
          key: "test-key",
          secret: "test-secret",
          region: "us-east-1",
          bucket: "test-bucket",
          root: "media",
        },
      });

      const s3MediaLibrary = new MediaLibrary(mockPrismaClient);

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
        disk: "s3",
        size: 1024,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaClient.media.create.mockResolvedValue(mockMediaRecord);

      const attachedMedia = await s3MediaLibrary.attachFile(
        "user",
        "user-123",
        mockFile,
        {
          collection: "avatar",
          disk: "s3",
        }
      );

      expect(attachedMedia.disk).toBe("s3");
    });
  });
});
