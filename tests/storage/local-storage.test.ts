import { jest } from "@jest/globals";
import { LocalStorageDriver } from "../../src/media/storage/local-storage.driver";

// Mock the config
jest.mock("../../src/media/config", () => ({
  getLocalConfig: jest.fn(() => ({
    root: "test-uploads",
    public_base_url: "http://localhost:3000/uploads",
  })),
}));

describe("LocalStorageDriver", () => {
  let driver: LocalStorageDriver;
  const mockFs = require("fs/promises");

  beforeEach(() => {
    driver = new LocalStorageDriver();
    jest.clearAllMocks();
  });

  describe("put", () => {
    it("should store file and return metadata", async () => {
      const filePath = "test/file.jpg";
      const contents = Buffer.from("test content");
      const options = {
        contentType: "image/jpeg",
        visibility: "public" as const,
      };

      const result = await driver.put(filePath, contents, options);

      expect(mockFs.mkdir).toHaveBeenCalledWith("test-uploads/test", {
        recursive: true,
      });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "test-uploads/test/file.jpg",
        contents
      );
      expect(mockFs.stat).toHaveBeenCalledWith("test-uploads/test/file.jpg");

      expect(result).toEqual({
        path: filePath,
        size: 1024,
        lastModified: new Date("2023-01-01"),
      });
    });

    it("should handle string content", async () => {
      const filePath = "test/file.txt";
      const contents = "test string content";

      const result = await driver.put(filePath, contents);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "test-uploads/test/file.txt",
        contents
      );
      expect(result.path).toBe(filePath);
    });
  });

  describe("get", () => {
    it("should read file content", async () => {
      const filePath = "test/file.jpg";

      const result = await driver.get(filePath);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        "test-uploads/test/file.jpg"
      );
      expect(result).toEqual(Buffer.from("mock-file-data"));
    });
  });

  describe("delete", () => {
    it("should delete file", async () => {
      const filePath = "test/file.jpg";

      await driver.delete(filePath);

      expect(mockFs.unlink).toHaveBeenCalledWith("test-uploads/test/file.jpg");
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      const filePath = "test/file.jpg";

      const result = await driver.exists(filePath);

      expect(mockFs.access).toHaveBeenCalledWith("test-uploads/test/file.jpg");
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      const filePath = "test/nonexistent.jpg";
      mockFs.access.mockRejectedValueOnce(new Error("File not found") as never);

      const result = await driver.exists(filePath);

      expect(mockFs.access).toHaveBeenCalledWith(
        "test-uploads/test/nonexistent.jpg"
      );
      expect(result).toBe(false);
    });
  });

  describe("url", () => {
    it("should generate public URL", () => {
      const filePath = "test/file.jpg";

      const url = driver.url(filePath);

      expect(url).toBe("http://localhost:3000/uploads/test/file.jpg");
    });
  });

  describe("temporaryUrl", () => {
    it("should return same as regular URL", async () => {
      const filePath = "test/file.jpg";

      const url = await driver.temporaryUrl(filePath, 3600);

      expect(url).toBe("http://localhost:3000/uploads/test/file.jpg");
    });
  });
});
