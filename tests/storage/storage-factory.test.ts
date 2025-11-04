/**
 * Storage Factory Tests
 */

import { createStorageDriver } from "../../src/storage/storage-factory";
import {
  DiskConfig,
  LocalDisk,
  S3Disk,
  BunnyCDNDisk,
} from "../../src/config/schema";
import { ConfigurationError } from "../../src/core/errors";
import { LocalStorageDriver } from "../../src/storage/local/driver.local";
import { S3StorageDriver } from "../../src/storage/s3/driver.s3";
import { BunnyCDNStorageDriver } from "../../src/storage/bunnycdn/driver.bunny";

describe("createStorageDriver", () => {
  describe("Local Storage Driver", () => {
    it("should create a new LocalStorageDriver instance", () => {
      const config: LocalDisk = {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });

    it("should create different instances on each call", () => {
      const config: LocalDisk = {
        driver: "local",
        root: "uploads",
        public_base_url: "http://localhost:3000/uploads",
      };

      const driver1 = createStorageDriver(config);
      const driver2 = createStorageDriver(config);

      expect(driver1).not.toBe(driver2);
      expect(driver1).toBeInstanceOf(LocalStorageDriver);
      expect(driver2).toBeInstanceOf(LocalStorageDriver);
    });
  });

  describe("S3 Storage Driver", () => {
    it("should create a new S3StorageDriver instance", () => {
      const config: S3Disk = {
        driver: "s3",
        key: "test-key",
        secret: "test-secret",
        region: "us-east-1",
        bucket: "test-bucket",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(S3StorageDriver);
    });

    it("should create different instances on each call", () => {
      const config: S3Disk = {
        driver: "s3",
        key: "test-key",
        secret: "test-secret",
        region: "us-east-1",
        bucket: "test-bucket",
      };

      const driver1 = createStorageDriver(config);
      const driver2 = createStorageDriver(config);

      expect(driver1).not.toBe(driver2);
      expect(driver1).toBeInstanceOf(S3StorageDriver);
      expect(driver2).toBeInstanceOf(S3StorageDriver);
    });
  });

  describe("BunnyCDN Storage Driver", () => {
    it("should create a new BunnyCDNStorageDriver instance", () => {
      const config: BunnyCDNDisk = {
        driver: "bunnycdn",
        storage_zone: "test-zone",
        api_key: "test-api-key",
        pull_zone: "test-pull-zone",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(BunnyCDNStorageDriver);
    });

    it("should create different instances on each call", () => {
      const config: BunnyCDNDisk = {
        driver: "bunnycdn",
        storage_zone: "test-zone",
        api_key: "test-api-key",
        pull_zone: "test-pull-zone",
      };

      const driver1 = createStorageDriver(config);
      const driver2 = createStorageDriver(config);

      expect(driver1).not.toBe(driver2);
      expect(driver1).toBeInstanceOf(BunnyCDNStorageDriver);
      expect(driver2).toBeInstanceOf(BunnyCDNStorageDriver);
    });
  });

  describe("Error Handling", () => {
    it("should throw ConfigurationError when config is null", () => {
      expect(() => {
        createStorageDriver(null as unknown as DiskConfig);
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when config is undefined", () => {
      expect(() => {
        createStorageDriver(undefined as unknown as DiskConfig);
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when driver is missing", () => {
      const config = {} as DiskConfig;
      expect(() => {
        createStorageDriver(config);
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for invalid driver type", () => {
      const config = {
        driver: "invalid-driver",
      } as unknown as DiskConfig;

      expect(() => {
        createStorageDriver(config);
      }).toThrow(ConfigurationError);
      expect(() => {
        createStorageDriver(config);
      }).toThrow("Unsupported storage driver type");
    });
  });

  describe("Configuration Validation", () => {
    it("should pass configuration to LocalStorageDriver", () => {
      const config: LocalDisk = {
        driver: "local",
        root: "custom-uploads",
        public_base_url: "https://example.com/media",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(LocalStorageDriver);
      // Verify the driver is configured (we can't directly access private properties,
      // but we can test that it accepts the config without error)
      expect(driver).toBeDefined();
    });

    it("should pass configuration to S3StorageDriver", () => {
      const config: S3Disk = {
        driver: "s3",
        key: "custom-key",
        secret: "custom-secret",
        region: "eu-west-1",
        bucket: "custom-bucket",
        root: "custom-root",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(S3StorageDriver);
      expect(driver).toBeDefined();
    });

    it("should pass configuration to BunnyCDNStorageDriver", () => {
      const config: BunnyCDNDisk = {
        driver: "bunnycdn",
        storage_zone: "custom-zone",
        api_key: "custom-api-key",
        pull_zone: "custom-pull-zone",
        root: "custom-root",
        region: "de",
      };

      const driver = createStorageDriver(config);

      expect(driver).toBeInstanceOf(BunnyCDNStorageDriver);
      expect(driver).toBeDefined();
    });
  });
});
