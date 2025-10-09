/**
 * Storage Factory
 *
 * Creates storage driver instances based on configuration
 */

import { StorageDriver } from "../core/contracts";
import { ConfigurationError } from "../core/errors";
import { DiskConfig } from "../config/schema";
import { LocalStorageDriver } from "./local/driver.local";
import { S3StorageDriver } from "./s3/driver.s3";
import { BunnyCDNStorageDriver } from "./bunnycdn/driver.bunny";

export function createStorageDriver(config: DiskConfig): StorageDriver {
  switch (config.driver) {
    case "local":
      return new LocalStorageDriver(config);

    case "s3":
      return new S3StorageDriver(config);

    case "bunnycdn":
      return new BunnyCDNStorageDriver(config);

    default:
      throw new ConfigurationError(
        `Unknown storage driver: ${(config as any).driver}`
      );
  }
}
