import { jest } from "@jest/globals";
import { S3StorageDriver } from "../../src/media/storage/s3-storage.driver";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mock the config
jest.mock("../../src/media/config", () => ({
  getS3Config: jest.fn(() => ({
    key: "test-key",
    secret: "test-secret",
    region: "us-east-1",
    bucket: "test-bucket",
    root: "media",
    url: "https://cdn.example.com",
    endpoint: "https://s3.amazonaws.com",
    use_path_style_endpoint: false,
  })),
}));

describe("S3StorageDriver", () => {
  let driver: S3StorageDriver;
  let mockS3Client: jest.Mocked<S3Client>;

  beforeEach(() => {
    driver = new S3StorageDriver();
    mockS3Client = (driver as any).client;
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create S3Client with correct configuration", () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: {
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
        },
        forcePathStyle: false,
        endpoint: "https://s3.amazonaws.com",
      });
    });

    it("should create S3Client without endpoint when not provided", () => {
      // Mock config without endpoint
      const { getS3Config } = require("../../src/media/config");
      getS3Config.mockReturnValueOnce({
        key: "test-key",
        secret: "test-secret",
        region: "us-east-1",
        bucket: "test-bucket",
        use_path_style_endpoint: false,
      });

      const newDriver = new S3StorageDriver();
      expect(S3Client).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: {
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
        },
        forcePathStyle: false,
      });
    });
  });

  describe("put", () => {
    it("should upload file to S3 and return metadata", async () => {
      const filePath = "test/file.jpg";
      const contents = Buffer.from("test content");
      const options = {
        contentType: "image/jpeg",
        visibility: "public" as const,
      };

      // Mock S3 responses
      mockS3Client.send
        .mockResolvedValueOnce({} as never) // PutObject response
        .mockResolvedValueOnce({
          // HeadObject response
          ContentLength: 1024,
          LastModified: new Date("2023-01-01"),
          ETag: '"abc123"',
        } as never);

      const result = await driver.put(filePath, contents, options);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "media/test/file.jpg",
        Body: contents,
        ContentType: "image/jpeg",
        Metadata: undefined,
        ACL: "public-read",
      });

      expect(result).toEqual({
        path: filePath,
        size: 1024,
        lastModified: new Date("2023-01-01"),
        etag: '"abc123"',
      });
    });

    it("should handle private visibility", async () => {
      const filePath = "test/file.jpg";
      const contents = Buffer.from("test content");
      const options = {
        visibility: "private" as const,
      };

      mockS3Client.send
        .mockResolvedValueOnce({} as never)
        .mockResolvedValueOnce({
          ContentLength: 1024,
          LastModified: new Date("2023-01-01"),
        } as never);

      await driver.put(filePath, contents, options);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "media/test/file.jpg",
        Body: contents,
        ContentType: undefined,
        Metadata: undefined,
        ACL: "private",
      });
    });
  });

  describe("get", () => {
    it("should download file from S3", async () => {
      const filePath = "test/file.jpg";
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from("chunk1");
          yield Buffer.from("chunk2");
        },
      };

      mockS3Client.send.mockResolvedValueOnce({
        Body: mockStream,
      } as never);

      const result = await driver.get(filePath);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "media/test/file.jpg",
      });

      expect(Buffer.concat).toHaveBeenCalled();
    });

    it("should throw error when no body in response", async () => {
      const filePath = "test/file.jpg";

      mockS3Client.send.mockResolvedValueOnce({
        Body: null,
      } as never);

      await expect(driver.get(filePath)).rejects.toThrow(
        "No body in S3 response"
      );
    });
  });

  describe("delete", () => {
    it("should delete file from S3", async () => {
      const filePath = "test/file.jpg";

      mockS3Client.send.mockResolvedValueOnce({} as never);

      await driver.delete(filePath);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "media/test/file.jpg",
      });
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      const filePath = "test/file.jpg";

      mockS3Client.send.mockResolvedValueOnce({} as never);

      const result = await driver.exists(filePath);

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "media/test/file.jpg",
      });
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      const filePath = "test/nonexistent.jpg";

      mockS3Client.send.mockRejectedValueOnce({ name: "NotFound" } as never);

      const result = await driver.exists(filePath);

      expect(result).toBe(false);
    });

    it("should rethrow non-NotFound errors", async () => {
      const filePath = "test/file.jpg";
      const error = new Error("Access denied");

      mockS3Client.send.mockRejectedValueOnce(error as never);

      await expect(driver.exists(filePath)).rejects.toThrow("Access denied");
    });
  });

  describe("url", () => {
    it("should generate URL using custom base URL", () => {
      const filePath = "test/file.jpg";

      const url = driver.url(filePath);

      expect(url).toBe("https://cdn.example.com/media/test/file.jpg");
    });

    it("should generate URL using default S3 format", () => {
      // Mock config without custom URL
      const { getS3Config } = require("../../src/media/config");
      getS3Config.mockReturnValueOnce({
        key: "test-key",
        secret: "test-secret",
        region: "us-east-1",
        bucket: "test-bucket",
      });

      const newDriver = new S3StorageDriver();
      const url = newDriver.url("test/file.jpg");

      expect(url).toBe(
        "https://test-bucket.s3.us-east-1.amazonaws.com/test/file.jpg"
      );
    });

    it("should handle empty root prefix", () => {
      const { getS3Config } = require("../../src/media/config");
      getS3Config.mockReturnValueOnce({
        key: "test-key",
        secret: "test-secret",
        region: "us-east-1",
        bucket: "test-bucket",
        root: "",
      });

      const newDriver = new S3StorageDriver();
      const url = newDriver.url("test/file.jpg");

      expect(url).toBe(
        "https://test-bucket.s3.us-east-1.amazonaws.com/test/file.jpg"
      );
    });
  });

  describe("temporaryUrl", () => {
    it("should generate signed URL", async () => {
      const filePath = "test/file.jpg";

      const url = await driver.temporaryUrl(filePath, 3600);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(GetObjectCommand),
        { expiresIn: 3600 }
      );
      expect(url).toBe("https://mock-signed-url.com");
    });
  });
});
