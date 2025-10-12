/**
 * File Validator Tests
 */

import { Readable } from "stream";
import {
  createFileValidator,
  FileValidator,
  ValidationRule,
} from "../../src/validation/file-validator";

// Mock sharp
jest.mock("sharp", () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: "jpeg",
    }),
  }));
});

describe("FileValidator", () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = createFileValidator({
      fileTypes: {
        images: ["jpeg", "jpg", "png", "gif"],
        documents: ["pdf", "doc", "docx"],
        text: ["txt", "csv"],
        audio: [],
        video: [],
        archives: [],
      },
      contentValidation: true,
      virusScanning: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      customValidators: [],
    });
  });

  describe("file size validation", () => {
    it("should accept files within size limit", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from("fake image data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject files exceeding size limit", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "large.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 10 * 1024 * 1024, // 10MB (exceeds 5MB limit)
        buffer: Buffer.from("fake image data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("exceeds maximum allowed size");
    });
  });

  describe("MIME type validation", () => {
    it("should accept allowed file extensions", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "document.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 1024 * 1024,
        buffer: Buffer.from("fake pdf data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result.valid).toBe(true);
    });

    it("should reject disallowed file extensions", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "script.exe",
        encoding: "7bit",
        mimetype: "application/x-msdownload",
        size: 1024,
        buffer: Buffer.from("fake exe data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("not allowed"))).toBe(true);
    });

    it("should validate against allowedMimeTypes list", async () => {
      const strictValidator = createFileValidator({
        fileTypes: {
          images: ["jpeg", "jpg", "png"],
          documents: [],
          text: [],
          audio: [],
          video: [],
          archives: [],
        },
        allowedMimeTypes: ["image/jpeg", "image/png"],
        contentValidation: false,
        virusScanning: false,
        maxFileSize: 5 * 1024 * 1024,
        customValidators: [],
      });

      const allowedFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from("fake"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const disallowedFile: Express.Multer.File = {
        ...allowedFile,
        originalname: "test.gif",
        mimetype: "image/gif",
      };

      const result1 = await strictValidator.validate(allowedFile);
      expect(result1.valid).toBe(true);

      const result2 = await strictValidator.validate(disallowedFile);
      expect(result2.valid).toBe(false);
    });

    it("should reject blocked MIME types", async () => {
      const strictValidator = createFileValidator({
        fileTypes: {
          images: ["jpeg", "jpg"],
          documents: [],
          text: [],
          audio: [],
          video: [],
          archives: [],
        },
        blockedMimeTypes: ["image/gif", "application/x-msdownload"],
        contentValidation: false,
        virusScanning: false,
        maxFileSize: 5 * 1024 * 1024,
        customValidators: [],
      });

      const blockedFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.gif",
        encoding: "7bit",
        mimetype: "image/gif",
        size: 1024,
        buffer: Buffer.from("fake"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await strictValidator.validate(blockedFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("blocked"))).toBe(true);
    });
  });

  describe("image validation", () => {
    it("should validate image dimensions", async () => {
      const dimensionValidator = createFileValidator({
        fileTypes: {
          images: ["jpeg", "jpg", "png"],
          documents: [],
          text: [],
          audio: [],
          video: [],
          archives: [],
        },
        contentValidation: true,
        virusScanning: false,
        maxFileSize: 5 * 1024 * 1024,
        maxImageDimensions: {
          width: 2000,
          height: 2000,
        },
        customValidators: [],
      });

      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "image.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from("fake image data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await dimensionValidator.validate(file);
      // Mock returns 1920x1080, which is under 2000x2000 limit
      expect(result.valid).toBe(true);
    });

    it("should return image metadata", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "image.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from("fake image data"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.mimeType).toBe("image/jpeg");
      expect(result.metadata?.fileSize).toBe(1024);
    });
  });

  describe("custom validators", () => {
    it("should execute custom validation rules", async () => {
      const customRule: ValidationRule = {
        name: "fileNameLength",
        validator: (file) => file.originalname.length < 50,
        errorMessage: "Filename too long",
      };

      validator.addCustomValidator(customRule);

      const validFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "short.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024,
        buffer: Buffer.from("fake"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const invalidFile: Express.Multer.File = {
        ...validFile,
        originalname: "a".repeat(60) + ".jpg",
      };

      const result1 = await validator.validate(validFile);
      expect(result1.valid).toBe(true);

      const result2 = await validator.validate(invalidFile);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain("Filename too long");
    });

    it("should allow removing custom validators", () => {
      const rule: ValidationRule = {
        name: "testRule",
        validator: () => true,
        errorMessage: "Test error",
      };

      validator.addCustomValidator(rule);
      const config1 = validator.getConfig();
      expect(config1.customValidators).toHaveLength(1);

      validator.removeCustomValidator("testRule");
      const config2 = validator.getConfig();
      expect(config2.customValidators).toHaveLength(0);
    });

    it("should handle async custom validators", async () => {
      const asyncRule: ValidationRule = {
        name: "asyncCheck",
        validator: async (file) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return file.size > 500;
        },
        errorMessage: "File too small",
      };

      validator.addCustomValidator(asyncRule);

      const smallFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "small.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 100,
        buffer: Buffer.from("fake"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(smallFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File too small");
    });
  });

  describe("configuration management", () => {
    it("should get validation configuration", () => {
      const config = validator.getConfig();
      expect(config).toBeDefined();
      expect(config.fileTypes).toBeDefined();
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it("should update validation configuration", () => {
      validator.updateConfig({
        maxFileSize: 10 * 1024 * 1024,
      });

      const config = validator.getConfig();
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe("default validators", () => {
    it("should create default file validator", () => {
      const defaultValidator = createFileValidator();
      const config = defaultValidator.getConfig();

      expect(config.contentValidation).toBe(true);
      expect(config.virusScanning).toBe(false);
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.fileTypes.images).toContain("jpeg");
      expect(config.fileTypes.documents).toContain("pdf");
    });
  });

  describe("edge cases", () => {
    it("should handle empty buffer", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "test.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 0,
        buffer: Buffer.alloc(0),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result).toBeDefined();
    });

    it("should handle files without extensions", async () => {
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: "noextension",
        encoding: "7bit",
        mimetype: "application/octet-stream",
        size: 1024,
        buffer: Buffer.from("fake"),
        destination: "",
        filename: "",
        path: "",
        stream: {} as Readable,
      };

      const result = await validator.validate(file);
      expect(result).toBeDefined();
    });
  });
});
