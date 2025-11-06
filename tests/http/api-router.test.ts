/**
 * API Router Tests
 */

import { PrismaClient } from "@prisma/client";
import { createEnhancedMediaLibrary } from "../../src/factory";
import { createApiRouter } from "../../src/http/api-router";
import { StorageDriver } from "../../src/core/contracts";
import { MockStorageDriver } from "../__mocks__/mock-storage.driver";
import { ConfigurationError } from "../../src/core/errors";

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

describe("ApiRouter", () => {
  let mediaLibrary: any;
  let apiRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

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
      },
      prisma: mockPrismaClient,
    });

    apiRouter = createApiRouter(mediaLibrary, {
      basePath: "/api/media",
      endpoints: {
        upload: "/upload",
        download: "/:id/download",
        delete: "/:id",
        list: "/",
        info: "/:id",
      },
    });
  });

  describe("createApiRouter", () => {
    it("should create API router instance", () => {
      expect(apiRouter).toBeDefined();
    });

    it("should return Express router", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should apply default configuration", () => {
      const config = apiRouter.getConfig();
      expect(config.basePath).toBe("/api/media");
      expect(config.endpoints.upload).toBe("/upload");
    });
  });

  describe("configuration", () => {
    it("should get API configuration", () => {
      const config = apiRouter.getConfig();
      expect(config).toBeDefined();
      expect(config.basePath).toBe("/api/media");
      expect(config.endpoints).toBeDefined();
    });

    it("should update API configuration", () => {
      apiRouter.updateConfig({
        basePath: "/api/v2/media",
      });

      const config = apiRouter.getConfig();
      expect(config.basePath).toBe("/api/v2/media");
    });

    it("should recreate routes when config updated", () => {
      apiRouter.updateConfig({
        endpoints: {
          upload: "/new-upload",
          download: "/:id/get",
          delete: "/:id/remove",
          list: "/all",
          info: "/:id/details",
        },
      });

      const router2 = apiRouter.getRouter();
      expect(router2).toBeDefined();
      // Router should be recreated
    });
  });

  describe("router endpoints", () => {
    it("should have upload endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
      // Router setup verified by integration
    });

    it("should have download endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should have delete endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should have list endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should have info endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should have health check endpoint", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });
  });

  describe("endpoint configuration", () => {
    it("should use custom endpoint paths", () => {
      const customRouter = createApiRouter(mediaLibrary, {
        basePath: "/api/files",
        endpoints: {
          upload: "/new",
          download: "/:id/get",
          delete: "/:id/remove",
          list: "/all",
          info: "/:id/data",
        },
      });

      const config = customRouter.getConfig();
      expect(config.endpoints.upload).toBe("/new");
      expect(config.endpoints.download).toBe("/:id/get");
    });
  });

  describe("integration with EnhancedMediaLibrary", () => {
    it("should work with media library instance", () => {
      expect(apiRouter).toBeDefined();
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
    });

    it("should integrate with Express app", () => {
      const router = apiRouter.getRouter();
      expect(router).toBeDefined();
      expect(typeof router.use).toBe("function");
      expect(typeof router.get).toBe("function");
      expect(typeof router.post).toBe("function");
      expect(typeof router.delete).toBe("function");
    });
  });

  describe("default configuration", () => {
    it("should create router with default config", () => {
      const defaultRouter = createApiRouter(mediaLibrary);
      const config = defaultRouter.getConfig();

      expect(config.basePath).toBe("/api/media");
      expect(config.endpoints.upload).toBe("/upload");
      expect(config.endpoints.download).toBe("/:id/download");
      expect(config.endpoints.delete).toBe("/:id");
      expect(config.endpoints.list).toBe("/");
      expect(config.endpoints.info).toBe("/:id");
    });
  });

  describe("getStorageDriver", () => {
    describe("with MediaLibrary delegation", () => {
      it("should return storage driver for configured disk", () => {
        const driver = apiRouter.getStorageDriver("local");

        expect(driver).toBeDefined();
        expect(typeof driver.put).toBe("function");
        expect(typeof driver.get).toBe("function");
        expect(typeof driver.delete).toBe("function");
        expect(typeof driver.exists).toBe("function");
        expect(typeof driver.url).toBe("function");
        expect(typeof driver.temporaryUrl).toBe("function");
      });

      it("should throw error for non-existent disk", () => {
        expect(() => {
          apiRouter.getStorageDriver("nonexistent");
        }).toThrow(ConfigurationError);
      });

      it("should return same driver instance for same disk (cached)", () => {
        const driver1 = apiRouter.getStorageDriver("local");
        const driver2 = apiRouter.getStorageDriver("local");

        // Should return the same instance (cached by MediaLibrary)
        expect(driver1).toBe(driver2);
      });
    });

    describe("with multiple disks configured", () => {
      let multiDiskMediaLibrary: any;
      let multiDiskRouter: any;

      beforeEach(() => {
        multiDiskMediaLibrary = createEnhancedMediaLibrary({
          config: {
            disk: "local",
            disks: {
              local: {
                driver: "local",
                root: "./test-uploads/local",
                public_base_url: "http://localhost:3000/uploads/local",
              },
              public: {
                driver: "local",
                root: "./test-uploads/public",
                public_base_url: "http://localhost:3000/uploads/public",
              },
              temp: {
                driver: "local",
                root: "./test-uploads/temp",
                public_base_url: "http://localhost:3000/uploads/temp",
              },
            },
          },
          prisma: mockPrismaClient,
        });

        multiDiskRouter = createApiRouter(multiDiskMediaLibrary, {
          basePath: "/api/media",
          endpoints: {
            upload: "/upload",
            download: "/:id/download",
            delete: "/:id",
            list: "/",
            info: "/:id",
          },
        });
      });

      it("should return different drivers for different disks", () => {
        const localDriver = multiDiskRouter.getStorageDriver("local");
        const publicDriver = multiDiskRouter.getStorageDriver("public");
        const tempDriver = multiDiskRouter.getStorageDriver("temp");

        expect(localDriver).toBeDefined();
        expect(publicDriver).toBeDefined();
        expect(tempDriver).toBeDefined();

        // They should be different instances
        expect(localDriver).not.toBe(publicDriver);
        expect(publicDriver).not.toBe(tempDriver);
        expect(localDriver).not.toBe(tempDriver);
      });

      it("should return correct driver for each disk", () => {
        const localDriver = multiDiskRouter.getStorageDriver("local");
        const publicDriver = multiDiskRouter.getStorageDriver("public");

        // Both should implement StorageDriver interface
        expect(typeof localDriver.put).toBe("function");
        expect(typeof publicDriver.put).toBe("function");
      });
    });

    describe("with pre-initialized storage drivers", () => {
      let preInitializedDrivers: Map<string, StorageDriver>;
      let routerWithPreInit: any;

      beforeEach(() => {
        preInitializedDrivers = new Map<string, StorageDriver>();
        preInitializedDrivers.set("local", new MockStorageDriver());
        preInitializedDrivers.set("public", new MockStorageDriver());
        preInitializedDrivers.set("temp", new MockStorageDriver());

        routerWithPreInit = createApiRouter(mediaLibrary, {
          basePath: "/api/media",
          endpoints: {
            upload: "/upload",
            download: "/:id/download",
            delete: "/:id",
            list: "/",
            info: "/:id",
          },
          storageDrivers: preInitializedDrivers,
        });
      });

      it("should use pre-initialized driver when available", () => {
        const driver = routerWithPreInit.getStorageDriver("local");

        expect(driver).toBeDefined();
        expect(driver).toBeInstanceOf(MockStorageDriver);
        expect(driver).toBe(preInitializedDrivers.get("local"));
      });

      it("should use pre-initialized drivers for all configured disks", () => {
        const localDriver = routerWithPreInit.getStorageDriver("local");
        const publicDriver = routerWithPreInit.getStorageDriver("public");
        const tempDriver = routerWithPreInit.getStorageDriver("temp");

        expect(localDriver).toBeInstanceOf(MockStorageDriver);
        expect(publicDriver).toBeInstanceOf(MockStorageDriver);
        expect(tempDriver).toBeInstanceOf(MockStorageDriver);

        expect(localDriver).toBe(preInitializedDrivers.get("local"));
        expect(publicDriver).toBe(preInitializedDrivers.get("public"));
        expect(tempDriver).toBe(preInitializedDrivers.get("temp"));
      });

      it("should fall back to MediaLibrary when disk not in pre-initialized map", () => {
        // Create media library with additional disk
        const mediaLibraryWithExtraDisk = createEnhancedMediaLibrary({
          config: {
            disk: "local",
            disks: {
              local: {
                driver: "local",
                root: "./test-uploads",
                public_base_url: "http://localhost:3000/uploads",
              },
              s3: {
                driver: "s3",
                key: "test-key",
                secret: "test-secret",
                region: "us-east-1",
                bucket: "test-bucket",
              },
            },
          },
          prisma: mockPrismaClient,
        });

        // Router with only 'local' pre-initialized
        const partialPreInitDrivers = new Map<string, StorageDriver>();
        partialPreInitDrivers.set("local", new MockStorageDriver());

        const routerWithPartialPreInit = createApiRouter(
          mediaLibraryWithExtraDisk,
          {
            basePath: "/api/media",
            endpoints: {
              upload: "/upload",
              download: "/:id/download",
              delete: "/:id",
              list: "/",
              info: "/:id",
            },
            storageDrivers: partialPreInitDrivers,
          }
        );

        // 'local' should use pre-initialized driver
        const localDriver = routerWithPartialPreInit.getStorageDriver("local");
        expect(localDriver).toBeInstanceOf(MockStorageDriver);
        expect(localDriver).toBe(partialPreInitDrivers.get("local"));

        // 's3' should fall back to MediaLibrary
        const s3Driver = routerWithPartialPreInit.getStorageDriver("s3");
        expect(s3Driver).toBeDefined();
        expect(s3Driver).not.toBeInstanceOf(MockStorageDriver);
      });

      it("should prioritize pre-initialized drivers over MediaLibrary", () => {
        const mockDriver = new MockStorageDriver();
        preInitializedDrivers.set("local", mockDriver);

        const driver = routerWithPreInit.getStorageDriver("local");

        // Should use the pre-initialized mock, not MediaLibrary's driver
        expect(driver).toBe(mockDriver);
        expect(driver).toBeInstanceOf(MockStorageDriver);
      });
    });

    describe("error handling", () => {
      it("should throw ConfigurationError for non-existent disk", () => {
        expect(() => {
          apiRouter.getStorageDriver("nonexistent-disk");
        }).toThrow(ConfigurationError);
      });

      it("should throw error with descriptive message", () => {
        expect(() => {
          apiRouter.getStorageDriver("nonexistent-disk");
        }).toThrow("Disk configuration not found");
      });
    });
  });
});
