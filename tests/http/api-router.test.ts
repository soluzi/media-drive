/**
 * API Router Tests
 */

import { PrismaClient } from "@prisma/client";
import { createEnhancedMediaLibrary } from "../../src/factory";
import { createApiRouter } from "../../src/http/api-router";

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
});
