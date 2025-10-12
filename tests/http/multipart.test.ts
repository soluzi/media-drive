/**
 * Multipart Middleware Tests
 */

import { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  createMultipartMiddleware,
  MultipartMiddleware,
  MultipartConfig,
} from "../../src/http/multipart";

describe("MultipartMiddleware", () => {
  let config: MultipartConfig;
  let middleware: MultipartMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      fileField: "file",
      limits: {
        fileSize: 1024 * 1024, // 1MB
        files: 5,
        fields: 10,
        fieldSize: 1024,
        fieldNameSize: 256,
        parts: 10,
      },
      storage: "memory",
      preservePath: false,
    };
    middleware = createMultipartMiddleware(config);
  });

  describe("createMultipartMiddleware", () => {
    it("should create middleware with default config", () => {
      const mw = createMultipartMiddleware({
        enabled: true,
        fileField: "file",
      });
      expect(mw).toBeInstanceOf(MultipartMiddleware);
    });

    it("should merge custom config with defaults", () => {
      const customMw = createMultipartMiddleware({
        enabled: true,
        fileField: "customFile",
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
      });
      const mwConfig = customMw.getConfig();
      expect(mwConfig.fileField).toBe("customFile");
      expect(mwConfig.limits?.fileSize).toBe(5 * 1024 * 1024);
    });
  });

  describe("configuration", () => {
    it("should get current configuration", () => {
      const currentConfig = middleware.getConfig();
      expect(currentConfig.enabled).toBe(true);
      expect(currentConfig.fileField).toBe("file");
      expect(currentConfig.limits?.fileSize).toBe(1024 * 1024);
    });

    it("should update configuration", () => {
      middleware.updateConfig({
        fileField: "newFile",
        limits: {
          fileSize: 2 * 1024 * 1024,
          files: 10,
        },
      });

      const updatedConfig = middleware.getConfig();
      expect(updatedConfig.fileField).toBe("newFile");
      expect(updatedConfig.limits?.fileSize).toBe(2 * 1024 * 1024);
    });
  });

  describe("middleware methods", () => {
    it("should provide single file upload middleware", () => {
      const singleMw = middleware.single("file");
      expect(singleMw).toBeDefined();
      expect(typeof singleMw).toBe("function");
    });

    it("should provide array upload middleware", () => {
      const arrayMw = middleware.array("files", 5);
      expect(arrayMw).toBeDefined();
      expect(typeof arrayMw).toBe("function");
    });

    it("should provide fields upload middleware", () => {
      const fieldsMw = middleware.fields([
        { name: "avatar", maxCount: 1 },
        { name: "gallery", maxCount: 5 },
      ]);
      expect(fieldsMw).toBeDefined();
      expect(typeof fieldsMw).toBe("function");
    });

    it("should provide any files middleware", () => {
      const anyMw = middleware.any();
      expect(anyMw).toBeDefined();
      expect(typeof anyMw).toBe("function");
    });

    it("should provide progress tracking middleware", () => {
      const progressMw = middleware.withProgress("file");
      expect(progressMw).toBeDefined();
      expect(typeof progressMw).toBe("function");
    });

    it("should provide streaming middleware", () => {
      const streamMw = middleware.streaming("file");
      expect(streamMw).toBeDefined();
      expect(typeof streamMw).toBe("function");
    });
  });

  describe("error handler", () => {
    it("should provide error handler middleware", () => {
      const errorHandler = middleware.errorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe("function");
    });

    it("should handle LIMIT_FILE_SIZE error", () => {
      const errorHandler = middleware.errorHandler();
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      const multerError = new multer.MulterError("LIMIT_FILE_SIZE");

      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "File too large",
          code: "FILE_TOO_LARGE",
        })
      );
    });

    it("should handle LIMIT_FILE_COUNT error", () => {
      const errorHandler = middleware.errorHandler();
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      const multerError = new multer.MulterError("LIMIT_FILE_COUNT");

      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Too many files",
          code: "TOO_MANY_FILES",
        })
      );
    });

    it("should handle LIMIT_UNEXPECTED_FILE error", () => {
      const errorHandler = middleware.errorHandler();
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      const multerError = new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "badField"
      );

      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Unexpected file field",
          code: "UNEXPECTED_FILE_FIELD",
        })
      );
    });

    it("should handle file type errors", () => {
      const errorHandler = middleware.errorHandler();
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      const fileTypeError = new Error("File type not allowed");

      errorHandler(fileTypeError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Invalid file type",
          code: "INVALID_FILE_TYPE",
        })
      );
    });

    it("should pass non-multer errors to next", () => {
      const errorHandler = middleware.errorHandler();
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      const genericError = new Error("Some other error");

      errorHandler(genericError, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("configuration limits", () => {
    it("should apply file size limits", () => {
      const mw = createMultipartMiddleware({
        enabled: true,
        fileField: "file",
        limits: {
          fileSize: 500 * 1024, // 500KB
        },
      });

      const config = mw.getConfig();
      expect(config.limits?.fileSize).toBe(500 * 1024);
    });

    it("should apply file count limits", () => {
      const mw = createMultipartMiddleware({
        enabled: true,
        fileField: "file",
        limits: {
          files: 3,
        },
      });

      const config = mw.getConfig();
      expect(config.limits?.files).toBe(3);
    });
  });
});
