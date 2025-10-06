import { jest } from "@jest/globals";

/**
 * Test helper functions for media library tests
 */

export function createMockFile(
  options: Partial<Express.Multer.File> = {}
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "test-file.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    buffer: Buffer.from("test-file-data"),
    size: 1024,
    destination: "",
    filename: "",
    path: "",
    stream: null as any,
    ...options,
  };
}

export function createMockMediaRecord(options: Partial<any> = {}): any {
  return {
    id: "media-123",
    model_type: "user",
    model_id: "user-123",
    collection_name: "default",
    name: "test-file.jpg",
    file_name: "randomfilename.jpg",
    mime_type: "image/jpeg",
    disk: "local",
    size: 1024,
    manipulations: {},
    custom_properties: {},
    responsive_images: {},
    order_column: null,
    created_at: new Date("2023-01-01T00:00:00Z"),
    updated_at: new Date("2023-01-01T00:00:00Z"),
    ...options,
  };
}

export function createMockPrismaClient() {
  return {
    media: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
}

export function createMockStorageDriver() {
  return {
    put: jest.fn().mockResolvedValue({
      path: "test/path",
      size: 1024,
      lastModified: new Date(),
    } as never),
    get: jest.fn().mockResolvedValue(Buffer.from("mock-file-data") as never),
    delete: jest.fn().mockResolvedValue(undefined as never),
    exists: jest.fn().mockResolvedValue(true as never),
    url: jest.fn().mockReturnValue("https://example.com/file.jpg"),
    temporaryUrl: jest
      .fn()
      .mockResolvedValue("https://example.com/signed-url" as never),
  };
}

export function mockFileTypeDetection(mimeType: string = "image/jpeg") {
  const { fileTypeFromBuffer } = require("file-type");
  (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
    mime: mimeType,
  } as never);
}

export function mockAxiosResponse(
  data: Buffer,
  contentType: string = "image/jpeg"
) {
  const axios = require("axios");
  (axios.get as jest.Mock).mockResolvedValue({
    data,
    headers: { "content-type": contentType },
  } as never);
}

export function mockSharpImageProcessing() {
  const sharp = require("sharp");
  const mockSharp = sharp as jest.Mock;

  mockSharp.mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    toBuffer: jest
      .fn()
      .mockResolvedValue(Buffer.from("processed-image-data") as never),
  });
}

export function createMockS3Response() {
  return {
    send: jest
      .fn()
      .mockResolvedValueOnce({} as never) // PutObject response
      .mockResolvedValueOnce({
        // HeadObject response
        ContentLength: 1024,
        LastModified: new Date("2023-01-01"),
        ETag: '"abc123"',
      } as never),
  };
}

export function createMockS3GetResponse() {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from("chunk1");
      yield Buffer.from("chunk2");
    },
  };

  return {
    send: jest.fn().mockResolvedValue({
      Body: mockStream,
    } as never),
  };
}

export function setupTestEnvironment() {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default mocks
  mockFileTypeDetection();
  mockSharpImageProcessing();

  // Mock crypto for consistent random file names
  const { randomBytes } = require("crypto");
  (randomBytes as jest.Mock).mockReturnValue({
    toString: jest.fn().mockReturnValue("testrandomstring123456789" as never),
  });
}

export function createTestConfig() {
  return {
    default_disk: "local" as const,
    local: {
      root: "test-uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
    s3: {
      key: "test-key",
      secret: "test-secret",
      region: "us-east-1",
      bucket: "test-bucket",
      root: "media",
      url: "https://cdn.example.com",
      endpoint: "https://s3.amazonaws.com",
      use_path_style_endpoint: false,
    },
  };
}
