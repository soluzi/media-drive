import { StorageDriver } from "../../types";
import { LocalStorageDriver } from "./local-storage.driver";
import { S3StorageDriver } from "./s3-storage.driver";
import { BunnyCDNStorageDriver } from "./bunnycdn-storage.driver";
import { getConfig } from "../config";

export function createStorageDriver(
  disk?: "local" | "s3" | "bunnycdn"
): StorageDriver {
  const config = getConfig();
  const targetDisk = disk || config.default_disk;

  switch (targetDisk) {
    case "local":
      return new LocalStorageDriver();
    case "s3":
      if (!config.s3) {
        throw new Error("S3 configuration not provided");
      }
      return new S3StorageDriver();
    case "bunnycdn":
      if (!config.bunnycdn) {
        throw new Error("BunnyCDN configuration not provided");
      }
      return new BunnyCDNStorageDriver();
    default:
      throw new Error(`Unsupported storage disk: ${targetDisk}`);
  }
}

export function getStorageDriver(
  disk?: "local" | "s3" | "bunnycdn"
): StorageDriver {
  return createStorageDriver(disk);
}
