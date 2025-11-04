/**
 * Storage Factory
 *
 * Creates new storage driver instances based on disk configuration.
 * Each call creates a fresh instance - drivers are not cached here.
 * Caching is handled by MediaLibrary.getStorageDriver() if needed.
 */

import { StorageDriver } from "../core/contracts";
import { DiskConfig, LocalDisk, S3Disk, BunnyCDNDisk } from "../config/schema";
import { LocalStorageDriver } from "./local/driver.local";
import { S3StorageDriver } from "./s3/driver.s3";
import { BunnyCDNStorageDriver } from "./bunnycdn/driver.bunny";
import { ConfigurationError } from "../core/errors";

/**
 * Create a new storage driver instance based on disk configuration.
 *
 * This function always creates a NEW instance - it does not reuse or cache drivers.
 * The configuration object is passed directly to the driver constructor.
 *
 * @param config - The disk configuration object from config.disks[diskName]
 * @returns A new StorageDriver instance configured for the specified disk
 * @throws ConfigurationError if the driver type is not supported or config is invalid
 *
 * @example
 * ```typescript
 * const diskConfig = config.disks["local"];
 * const driver = createStorageDriver(diskConfig); // New LocalStorageDriver instance
 * ```
 */
export function createStorageDriver(config: DiskConfig): StorageDriver {
  // Validate config is provided
  if (!config) {
    throw new ConfigurationError("Storage driver configuration is required");
  }

  // Validate driver type exists
  if (!config.driver) {
    throw new ConfigurationError(
      "Storage driver type is required in configuration"
    );
  }

  // Create new driver instance based on driver type
  switch (config.driver) {
    case "local": {
      // Type assertion ensures config matches LocalDisk schema
      const localConfig = config as LocalDisk;
      return new LocalStorageDriver(localConfig);
    }

    case "s3": {
      // Type assertion ensures config matches S3Disk schema
      const s3Config = config as S3Disk;
      return new S3StorageDriver(s3Config);
    }

    case "bunnycdn": {
      // Type assertion ensures config matches BunnyCDNDisk schema
      const bunnyConfig = config as BunnyCDNDisk;
      return new BunnyCDNStorageDriver(bunnyConfig);
    }

    default: {
      // TypeScript exhaustiveness check - this should never be reached
      // but handles runtime edge cases (e.g., invalid config from external sources)
      const invalidDriver = (config as { driver: unknown }).driver;
      throw new ConfigurationError(
        `Unsupported storage driver type: "${String(invalidDriver)}". ` +
          `Supported drivers are: local, s3, bunnycdn`
      );
    }
  }
}
