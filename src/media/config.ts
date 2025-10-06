import {
  MediaLibraryConfig,
  LocalConfig,
  S3Config,
  BunnyCDNConfig,
} from "../types";

let globalConfig: MediaLibraryConfig | null = null;

export function initMediaLibrary(config: MediaLibraryConfig): void {
  const configCopy: MediaLibraryConfig = {
    default_disk: config.default_disk,
    local: {
      root: config.local.root || "uploads",
      public_base_url:
        config.local.public_base_url || "http://localhost:3000/uploads",
    },
  };

  if (config.s3) {
    configCopy.s3 = {
      key: config.s3.key,
      secret: config.s3.secret,
      region: config.s3.region,
      bucket: config.s3.bucket,
      root: config.s3.root || "",
      url: config.s3.url || undefined,
      endpoint: config.s3.endpoint || undefined,
      use_path_style_endpoint: config.s3.use_path_style_endpoint || false,
    };
  }

  if (config.bunnycdn) {
    configCopy.bunnycdn = {
      storage_zone: config.bunnycdn.storage_zone,
      api_key: config.bunnycdn.api_key,
      pull_zone: config.bunnycdn.pull_zone,
      root: config.bunnycdn.root || "",
      region: config.bunnycdn.region || "de",
    };
  }

  globalConfig = configCopy;
}

export function getConfig(): MediaLibraryConfig {
  if (!globalConfig) {
    throw new Error(
      "Media library not initialized. Call initMediaLibrary() first."
    );
  }
  return globalConfig;
}

export function getLocalConfig(): LocalConfig {
  return getConfig().local;
}

export function getS3Config(): S3Config | undefined {
  return getConfig().s3;
}

export function getBunnyCDNConfig(): BunnyCDNConfig | undefined {
  return getConfig().bunnycdn;
}

export function getDefaultDisk(): "local" | "s3" | "bunnycdn" {
  return getConfig().default_disk;
}
