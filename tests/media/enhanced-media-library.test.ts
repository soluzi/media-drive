/**
 * Enhanced Media Library Tests
 */

import { PrismaClient } from "@prisma/client";
import { createEnhancedMediaLibrary } from "../../src/factory";
import { EnhancedMediaLibrary } from "../../src/media/enhanced-media-library";
import { ConfigurationError } from "../../src/core/errors";
import { Readable } from "stream";

// Mock Prisma
const mockPrismaClient = {
  media: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe("EnhancedMediaLibrary", () => {
  let mediaLibrary: EnhancedMediaLibrary;

  beforeEach(() => {
    jest.clearAllMocks();

    (mockPrismaClient.media.create as jest.Mock).mockResolvedValue({
      id: "test-id",
      path: "User/123/default/test.jpg",
      model_type: "User",
      model_id: "123",
      collection_name: "default",
      name: "test.jpg",
      file_name: "test.jpg",
      mime_type: "image/jpeg",
      disk: "local",
      size: 102400,
      manipulations: {},
      custom_properties: {},
      responsive_images: {},
      order_column: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    mediaLibrary = createEnhancedMediaLibrary({
      config: {
        disk: "local",
        disks: {
          local: {
            driver: "local",
            root: "./test-uploads",
            public_base_url: "http://localhost:3000/uploads",
          },
        },
        http: {
          enabled: true,
          multipart: {
            enabled: true,
            fileField: "file",
            limits: {
              fileSize: 5 * 1024 * 1024,
              files: 5,
            },
          },
        },
        validation: {
          fileTypes: {
            images: ["jpeg", "jpg", "png", "gif"],
            documents: ["pdf", "doc"],
            text: ["txt"],
            audio: [],
            video: [],
            archives: [],
          },
          contentValidation: true,
          virusScanning: false,
          maxFileSize: 5 * 1024 * 1024,
          customValidators: [],
        },
      },
      prisma: mockPrismaClient,
    });
  });

  describe("attachFileWithValidation", () => {
    it("should have attachFileWithValidation method", () => {
      expect(typeof mediaLibrary.attachFileWithValidation).toBe("function");
    });

    it("should have attachFromRequest method", () => {
      expect(typeof mediaLibrary.attachFromRequest).toBe("function");
    });
  });

  describe("getStorageDriver (via attachFile)", () => {
    let mediaLibraryWithMultipleDisks: EnhancedMediaLibrary;

    beforeEach(() => {
      jest.clearAllMocks();

      (mockPrismaClient.media.create as jest.Mock).mockResolvedValue({
        id: "test-id",
        path: "User/123/default/test.jpg",
        model_type: "User",
        model_id: "123",
        collection_name: "default",
        name: "test.jpg",
        file_name: "test.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 102400,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create enhanced media library with multiple disks configured
      mediaLibraryWithMultipleDisks = createEnhancedMediaLibrary({
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
          http: {
            enabled: true,
            multipart: {
              enabled: true,
              fileField: "file",
              limits: {
                fileSize: 5 * 1024 * 1024,
                files: 5,
              },
            },
          },
          validation: {
            fileTypes: {
              images: ["jpeg", "jpg", "png", "gif"],
              documents: ["pdf", "doc"],
              text: ["txt"],
              audio: [],
              video: [],
              archives: [],
            },
            contentValidation: true,
            virusScanning: false,
            maxFileSize: 5 * 1024 * 1024,
            customValidators: [],
          },
        },
        prisma: mockPrismaClient,
      });
    });

    it("should use specified disk when disk option provided in attachFileWithValidation", async () => {
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

      (mockPrismaClient.media.create as jest.Mock).mockResolvedValue({
        id: "test-id",
        path: "User/123/default/test.jpg",
        model_type: "User",
        model_id: "123",
        collection_name: "default",
        name: "test.jpg",
        file_name: "test.jpg",
        mime_type: "image/jpeg",
        disk: "temp",
        size: 15,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "temp",
          }
        );

      expect(result.media.disk).toBe("temp");
      expect(result.media.model_type).toBe("User");
      expect(result.media.model_id).toBe("123");
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

      const result =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file
        );

      expect(result.media.disk).toBe("local");
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
        mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "invalid-disk",
          }
        )
      ).rejects.toThrow(ConfigurationError);

      await expect(
        mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "invalid-disk",
          }
        )
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

      (mockPrismaClient.media.create as jest.Mock)
        .mockResolvedValueOnce({
          id: "test-id-1",
          path: "User/123/default/test.jpg",
          model_type: "User",
          model_id: "123",
          collection_name: "default",
          name: "test.jpg",
          file_name: "test.jpg",
          mime_type: "image/jpeg",
          disk: "temp",
          size: 4,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .mockResolvedValueOnce({
          id: "test-id-2",
          path: "User/456/default/test.jpg",
          model_type: "User",
          model_id: "456",
          collection_name: "default",
          name: "test.jpg",
          file_name: "test.jpg",
          mime_type: "image/jpeg",
          disk: "temp",
          size: 4,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: null,
          created_at: new Date(),
          updated_at: new Date(),
        });

      // First call should create and cache the driver
      const result1 =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "temp",
          }
        );

      // Second call should use cached driver
      const result2 =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "456",
          file,
          {
            modelType: "User",
            modelId: "456",
            disk: "temp",
          }
        );

      expect(result1.media.disk).toBe("temp");
      expect(result2.media.disk).toBe("temp");
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

      (mockPrismaClient.media.create as jest.Mock)
        .mockResolvedValueOnce({
          id: "test-id-1",
          path: "User/123/default/test.jpg",
          model_type: "User",
          model_id: "123",
          collection_name: "default",
          name: "test.jpg",
          file_name: "test.jpg",
          mime_type: "image/jpeg",
          disk: "local",
          size: 4,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .mockResolvedValueOnce({
          id: "test-id-2",
          path: "User/456/default/test.jpg",
          model_type: "User",
          model_id: "456",
          collection_name: "default",
          name: "test.jpg",
          file_name: "test.jpg",
          mime_type: "image/jpeg",
          disk: "temp",
          size: 4,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: null,
          created_at: new Date(),
          updated_at: new Date(),
        });

      const localResult =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "local",
          }
        );

      const tempResult =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "456",
          file,
          {
            modelType: "User",
            modelId: "456",
            disk: "temp",
          }
        );

      expect(localResult.media.disk).toBe("local");
      expect(tempResult.media.disk).toBe("temp");
      expect(localResult.media.disk).not.toBe(tempResult.media.disk);
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

      (mockPrismaClient.media.create as jest.Mock).mockResolvedValue({
        id: "test-id",
        path: "User/123/default/test.jpg",
        model_type: "User",
        model_id: "123",
        collection_name: "default",
        name: "test.jpg",
        file_name: "test.jpg",
        mime_type: "image/jpeg",
        disk: "temp",
        size: 4,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result =
        await mediaLibraryWithMultipleDisks.attachFileWithValidation(
          "User",
          "123",
          file,
          {
            modelType: "User",
            modelId: "123",
            disk: "temp",
          }
        );

      // Verify the disk was saved in the database record
      expect(mockPrismaClient.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          disk: "temp",
        }),
      });

      expect(result.media.disk).toBe("temp");
    });
  });

  describe("middleware methods", () => {
    it("should provide upload middleware", () => {
      const uploadMw = mediaLibrary.uploadMiddleware();
      expect(uploadMw).toBeDefined();
      expect(typeof uploadMw).toBe("function");
    });

    it("should provide upload with progress middleware", () => {
      const progressMw = mediaLibrary.uploadWithProgress();
      expect(progressMw).toBeDefined();
      expect(typeof progressMw).toBe("function");
    });

    it("should provide streaming upload middleware", () => {
      const streamMw = mediaLibrary.streamingUpload();
      expect(streamMw).toBeDefined();
      expect(typeof streamMw).toBe("function");
    });

    it("should provide error handler middleware", () => {
      const errorHandler = mediaLibrary.errorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe("function");
    });
  });

  describe("upload routes", () => {
    it("should create complete upload route", () => {
      const route = mediaLibrary.createUploadRoute();
      expect(Array.isArray(route)).toBe(true);
      expect(route.length).toBe(3); // middleware, error handler, handler
    });

    it("should create upload route with progress", () => {
      const route = mediaLibrary.createUploadRouteWithProgress();
      expect(Array.isArray(route)).toBe(true);
      expect(route.length).toBe(3);
    });

    it("should create streaming upload route", () => {
      const route = mediaLibrary.createStreamingUploadRoute();
      expect(Array.isArray(route)).toBe(true);
      expect(route.length).toBe(3);
    });
  });

  describe("validation configuration", () => {
    it("should add custom validation rule", () => {
      mediaLibrary.addValidationRule({
        name: "testRule",
        validator: (file: Express.Multer.File) => file.size < 1000,
        errorMessage: "Test error",
      });

      const config = mediaLibrary.getValidationConfig();
      expect(config.customValidators.length).toBeGreaterThanOrEqual(1);
      expect(config.customValidators.some((r) => r.name === "testRule")).toBe(
        true
      );
    });

    it("should remove validation rule", () => {
      mediaLibrary.addValidationRule({
        name: "testRule",
        validator: () => true,
        errorMessage: "Test",
      });

      const initialCount =
        mediaLibrary.getValidationConfig().customValidators.length;

      mediaLibrary.removeValidationRule("testRule");

      const finalCount =
        mediaLibrary.getValidationConfig().customValidators.length;
      expect(finalCount).toBeLessThan(initialCount);
    });

    it("should get validation configuration", () => {
      const config = mediaLibrary.getValidationConfig();
      expect(config).toBeDefined();
      expect(config.maxFileSize).toBeGreaterThan(0);
    });

    it("should update validation configuration", () => {
      mediaLibrary.updateValidationConfig({
        maxFileSize: 10 * 1024 * 1024,
      });

      const config = mediaLibrary.getValidationConfig();
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe("multipart configuration", () => {
    it("should get multipart configuration", () => {
      const config = mediaLibrary.getMultipartConfig();
      expect(config).toBeDefined();
      expect(config.fileField).toBeDefined();
      expect(config.limits).toBeDefined();
    });

    it("should update multipart configuration", () => {
      mediaLibrary.updateMultipartConfig({
        fileField: "newFile",
        limits: {
          fileSize: 2 * 1024 * 1024,
          files: 3,
        },
      });

      const config = mediaLibrary.getMultipartConfig();
      expect(config.fileField).toBe("newFile");
      expect(config.limits?.fileSize).toBe(2 * 1024 * 1024);
    });
  });

  describe("core functionality inherited from MediaLibrary", () => {
    it("should support all base MediaLibrary methods", () => {
      expect(typeof mediaLibrary.attachFile).toBe("function");
      expect(typeof mediaLibrary.attachFromUrl).toBe("function");
      expect(typeof mediaLibrary.list).toBe("function");
      expect(typeof mediaLibrary.remove).toBe("function");
      expect(typeof mediaLibrary.resolveFileUrl).toBe("function");
    });

    it("should support async conversions", () => {
      expect(typeof mediaLibrary.processConversionsAsync).toBe("function");
      expect(typeof mediaLibrary.getConversionJobStatus).toBe("function");
      expect(typeof mediaLibrary.getQueueStats).toBe("function");
    });
  });

  describe("factory function", () => {
    it("should create enhanced media library with minimal config", () => {
      const minimal = createEnhancedMediaLibrary({
        config: {
          disk: "local",
          disks: {
            local: {
              driver: "local",
              root: "./uploads",
              public_base_url: "http://localhost/uploads",
            },
          },
        },
        prisma: mockPrismaClient,
      });

      expect(minimal).toBeInstanceOf(EnhancedMediaLibrary);
    });

    it("should apply default enhanced config", () => {
      const lib = createEnhancedMediaLibrary({
        config: {
          disk: "local",
          disks: {
            local: {
              driver: "local",
              root: "./uploads",
              public_base_url: "http://localhost/uploads",
            },
          },
        },
        prisma: mockPrismaClient,
      });

      const multipartConfig = lib.getMultipartConfig();
      expect(multipartConfig).toBeDefined();
    });
  });
});
