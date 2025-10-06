import { jest } from "@jest/globals";
import {
  createStorageDriver,
  getStorageDriver,
} from "../../src/media/storage/storage-factory";
import { LocalStorageDriver } from "../../src/media/storage/local-storage.driver";
import { S3StorageDriver } from "../../src/media/storage/s3-storage.driver";

// Mock the config
jest.mock("../../src/media/config", () => ({
  getConfig: jest.fn(() => ({
    default_disk: "local",
    local: {
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
    s3: {
      key: "test-key",
      secret: "test-secret",
      region: "us-east-1",
      bucket: "test-bucket",
    },
  })),
}));

describe("Storage Factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createStorageDriver", () => {
    it("should create LocalStorageDriver for local disk", () => {
      const driver = createStorageDriver("local");

      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });

    it("should create S3StorageDriver for s3 disk", () => {
      const driver = createStorageDriver("s3");

      expect(driver).toBeInstanceOf(S3StorageDriver);
    });

    it("should use default disk when no disk specified", () => {
      const driver = createStorageDriver();

      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });

    it("should throw error for unsupported disk type", () => {
      expect(() => createStorageDriver("unsupported" as any)).toThrow(
        "Unsupported storage disk: unsupported"
      );
    });

    it("should throw error when S3 config not provided", () => {
      // Mock config without S3
      const { getConfig } = require("../../src/media/config");
      getConfig.mockReturnValueOnce({
        default_disk: "local",
        local: {
          root: "uploads",
          public_base_url: "http://localhost:3000/uploads",
        },
      } as never);

      expect(() => createStorageDriver("s3")).toThrow(
        "S3 configuration not provided"
      );
    });
  });

  describe("getStorageDriver", () => {
    it("should be an alias for createStorageDriver", () => {
      const driver1 = createStorageDriver("local");
      const driver2 = getStorageDriver("local");

      expect(driver1).toBeInstanceOf(LocalStorageDriver);
      expect(driver2).toBeInstanceOf(LocalStorageDriver);
    });
  });
});
