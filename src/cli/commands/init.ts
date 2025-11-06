/**
 * CLI: Init Command
 *
 * Initializes a new Media Drive configuration file (media.config.ts).
 * Generates a template configuration file with sensible defaults and examples
 * for all storage drivers (local, S3, BunnyCDN) and configuration options.
 *
 * The generated file includes:
 * - Disk configurations for local, S3, and BunnyCDN
 * - File size limits and security settings
 * - URL configuration and signing options
 * - Image conversion settings
 * - Queue configuration
 * - File naming and path generation strategies
 * - Logging configuration
 * - Media downloader settings
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";

/**
 * Template for media.config.ts file.
 * Contains a complete configuration example with all available options
 * and sensible defaults. Uses environment variables for sensitive values.
 */
const CONFIG_TEMPLATE = `import { defineConfig } from "media-drive";

export default defineConfig({
  // Default disk to use for storage
  disk: "local",

  // Disk configurations
  disks: {
    local: {
      driver: "local",
      root: "uploads",
      public_base_url: "http://localhost:3000/uploads",
    },
    
    s3: {
      driver: "s3",
      key: process.env.S3_KEY || "",
      secret: process.env.S3_SECRET || "",
      region: process.env.S3_REGION || "us-east-1",
      bucket: process.env.S3_BUCKET || "",
    },

    bunnycdn: {
      driver: "bunnycdn",
      storage_zone: process.env.BUNNY_STORAGE_ZONE || "",
      api_key: process.env.BUNNY_API_KEY || "",
      pull_zone: process.env.BUNNY_PULL_ZONE || "",
    },
  },

  // File size limits
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  // Security settings
  security: {
    allowedMime: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    forbiddenMime: [],
  },

  // URL configuration
  urls: {
    prefix: "",
    version: true,
    signedDefault: false,
    temporaryUrlExpiry: 3600, // 1 hour
  },

  // Image conversion defaults
  conversions: {
    progressive: true,
    defaultQuality: 85,
    stripMetadata: true,
  },

  // Responsive images
  responsiveImages: {
    enabled: true,
    widths: [640, 768, 1024, 1366, 1600, 1920],
  },

  // Queue configuration
  queue: {
    driver: "in-memory", // or "bullmq"
    name: "media-conversions",
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
    },
  },

  // File naming strategy
  fileNaming: {
    strategy: "random", // "random" | "original" | "uuid"
  },

  // Path generation strategy
  pathGeneration: {
    strategy: "default", // "default" | "date-based" | "flat"
  },

  // Logging
  logging: {
    level: "info", // "debug" | "info" | "warn" | "error"
  },

  // Media downloader
  mediaDownloader: {
    timeout: 30000,
    maxRedirects: 5,
    maxFileSize: 10 * 1024 * 1024,
  },
});
`;

/**
 * Initialize Media Drive configuration file.
 * Creates a new media.config.ts file in the specified directory (or current working directory).
 * The file contains a complete configuration template with all available options.
 *
 * Behavior:
 * - Creates target directory if it doesn't exist
 * - Checks if config file already exists (exits with error if found)
 * - Writes configuration template to media.config.ts
 * - Displays next steps for user
 *
 * @param targetDir - Optional target directory path (default: current working directory).
 *   Can be relative or absolute path. Directory will be created if it doesn't exist.
 * @returns Never returns (void), but may call process.exit(1) on errors.
 *
 * @example
 * ```bash
 * # Create config in current directory
 * media-drive init
 *
 * # Create config in specific directory
 * media-drive init --path ./config
 * ```
 */
export function initCommand(targetDir: string | undefined = undefined): void {
  // Resolve the target directory (use cwd if not specified)
  const resolvedDir = targetDir ? resolve(targetDir) : process.cwd();
  const configPath = join(resolvedDir, "media.config.ts");

  try {
    // Create directory if it doesn't exist
    if (!existsSync(resolvedDir)) {
      mkdirSync(resolvedDir, { recursive: true });
      console.log(`📁 Created directory: ${resolvedDir}`);
    }

    // Check if config already exists
    if (existsSync(configPath)) {
      console.error(`❌ Config file already exists at ${configPath}`);
      console.log("Remove it first or use a different path with --path");
      process.exit(1);
    }

    writeFileSync(configPath, CONFIG_TEMPLATE, "utf8");
    console.log(`✅ Created media.config.ts at ${configPath}`);
    console.log("\nNext steps:");
    console.log("1. Edit media.config.ts to match your setup");
    console.log("2. Run 'media-drive migrate' to set up the database");
    console.log("3. Import and use createMediaLibrary() in your app");
  } catch (error) {
    console.error("❌ Failed to create config file:", error);
    process.exit(1);
  }
}
