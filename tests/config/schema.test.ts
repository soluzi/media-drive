/**
 * Config Schema Tests
 */

import { ConfigSchema, defineConfig } from "../../src/config/schema";

describe("ConfigSchema", () => {
  it("should validate valid config", () => {
    const config = {
      disk: "local",
      disks: {
        local: {
          driver: "local" as const,
          root: "uploads",
          public_base_url: "http://localhost/uploads",
        },
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.disk).toBe("local");
  });

  it("should apply defaults", () => {
    const config = ConfigSchema.parse({});

    expect(config.disk).toBe("local");
    expect(config.limits.maxFileSize).toBe(10 * 1024 * 1024);
    expect(config.conversions.defaultQuality).toBe(85);
    expect(config.queue.driver).toBe("in-memory");
  });

  it("should validate S3 disk config", () => {
    const config = {
      disk: "s3",
      disks: {
        s3: {
          driver: "s3" as const,
          key: "test-key",
          secret: "test-secret",
          region: "us-east-1",
          bucket: "test-bucket",
        },
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.disks["s3"]).toBeDefined();
    expect(result.disks["s3"]?.driver).toBe("s3");
  });

  it("should validate BunnyCDN disk config", () => {
    const config = {
      disk: "bunnycdn",
      disks: {
        bunnycdn: {
          driver: "bunnycdn" as const,
          storage_zone: "test-zone",
          api_key: "test-key",
          pull_zone: "test.b-cdn.net",
        },
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.disks["bunnycdn"]).toBeDefined();
  });

  it("should validate security config", () => {
    const config = {
      security: {
        allowedMime: ["image/jpeg", "image/png"],
        forbiddenMime: ["application/x-executable"],
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.security.allowedMime).toHaveLength(2);
    expect(result.security.forbiddenMime).toHaveLength(1);
  });

  it("should validate queue config", () => {
    const config = {
      queue: {
        driver: "bullmq" as const,
        name: "test-queue",
        redis: {
          host: "localhost",
          port: 6379,
        },
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.queue.driver).toBe("bullmq");
    expect(result.queue.redis?.host).toBe("localhost");
  });
});

describe("defineConfig", () => {
  it("should create typed config", () => {
    const config = defineConfig({
      disk: "local",
      disks: {
        local: {
          driver: "local",
          root: "uploads",
          public_base_url: "http://localhost/uploads",
        },
      },
    });

    expect(config.disk).toBe("local");
  });

  it("should apply defaults via defineConfig", () => {
    const config = defineConfig({});

    expect(config.disk).toBe("local");
    expect(config.limits.maxFileSize).toBe(10 * 1024 * 1024);
  });
});
