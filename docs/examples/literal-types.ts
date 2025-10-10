/**
 * Literal Types Preservation Example
 * 
 * This example shows how to preserve literal types when using defineConfig
 */

import { defineConfig } from "../../src/config/schema";

// Method 1: Using 'as const' assertions (recommended)
const config1 = defineConfig({
  queue: {
    driver: "in-memory" as const, // Preserves literal type "in-memory"
    name: "my-queue",
  },
  fileNaming: {
    strategy: "uuid" as const, // Preserves literal type "uuid"
  },
  logging: {
    level: "debug" as const, // Preserves literal type "debug"
  },
});

// Method 2: Using 'satisfies' operator (TypeScript 4.9+)
const config2 = defineConfig({
  queue: {
    driver: "bullmq" satisfies "bullmq" | "in-memory",
    name: "background-queue",
    redis: {
      host: "localhost",
      port: 6379,
    },
  },
  disk: "s3" satisfies string,
  disks: {
    s3: {
      driver: "s3" satisfies "s3" | "local" | "bunnycdn",
      key: process.env.S3_KEY!,
      secret: process.env.S3_SECRET!,
      region: "us-east-1",
      bucket: "my-bucket",
    },
  },
});

// Method 3: Using helper function with explicit typing
function createQueueConfig() {
  return defineConfig({
    queue: {
      driver: "in-memory" as const,
      name: "test-queue",
    },
  });
}

const config3 = createQueueConfig();

// Type verification - these should all be literal types, not 'string'
type QueueDriver1 = typeof config1.queue.driver; // "in-memory"
type FileStrategy1 = typeof config1.fileNaming.strategy; // "uuid"
type LogLevel1 = typeof config1.logging.level; // "debug"

type QueueDriver2 = typeof config2.queue.driver; // "bullmq"
type DiskDriver2 = typeof config2.disk; // "s3"
type S3Driver2 = typeof config2.disks.s3.driver; // "s3"

type QueueDriver3 = typeof config3.queue.driver; // "in-memory"

// Usage examples
function handleQueueDriver(driver: "in-memory" | "bullmq") {
  console.log(`Processing with ${driver} queue driver`);
}

function handleFileStrategy(strategy: "random" | "original" | "uuid") {
  console.log(`Using ${strategy} file naming strategy`);
}

function handleLogLevel(level: "debug" | "info" | "warn" | "error") {
  console.log(`Log level set to ${level}`);
}

// These calls work because literal types are preserved
handleQueueDriver(config1.queue.driver); // ✅ Works: "in-memory"
handleQueueDriver(config2.queue.driver); // ✅ Works: "bullmq"
handleFileStrategy(config1.fileNaming.strategy); // ✅ Works: "uuid"
handleLogLevel(config1.logging.level); // ✅ Works: "debug"

// Example: Type-safe configuration builder
interface ConfigBuilder {
  withQueueDriver(driver: "in-memory" | "bullmq"): ConfigBuilder;
  withFileStrategy(strategy: "random" | "original" | "uuid"): ConfigBuilder;
  withLogLevel(level: "debug" | "info" | "warn" | "error"): ConfigBuilder;
  build(): typeof config1;
}

class MediaConfigBuilder implements ConfigBuilder {
  private config: any = {};

  withQueueDriver(driver: "in-memory" | "bullmq"): ConfigBuilder {
    this.config.queue = { driver, name: "default" };
    return this;
  }

  withFileStrategy(strategy: "random" | "original" | "uuid"): ConfigBuilder {
    this.config.fileNaming = { strategy };
    return this;
  }

  withLogLevel(level: "debug" | "info" | "warn" | "error"): ConfigBuilder {
    this.config.logging = { level };
    return this;
  }

  build() {
    return defineConfig(this.config);
  }
}

// Usage of the builder
const config4 = new MediaConfigBuilder()
  .withQueueDriver("in-memory")
  .withFileStrategy("uuid")
  .withLogLevel("debug")
  .build();

// Verify literal types are preserved
handleQueueDriver(config4.queue.driver); // ✅ Works
handleFileStrategy(config4.fileNaming.strategy); // ✅ Works
handleLogLevel(config4.logging.level); // ✅ Works

export { config1, config2, config3, config4 };
