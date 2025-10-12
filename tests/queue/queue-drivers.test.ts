/**
 * Queue Drivers Tests
 */

import { QueueDriver, ConversionJobData } from "../../src/core/contracts";
import { InMemoryQueueDriver } from "../../src/queue/in-memory-driver";

describe("QueueDriver Contract", () => {
  const testDrivers: Array<{
    name: string;
    driver: QueueDriver;
  }> = [];

  beforeAll(() => {
    testDrivers.push({
      name: "InMemoryQueueDriver",
      driver: new InMemoryQueueDriver(),
    });
  });

  testDrivers.forEach(({ name, driver }) => {
    describe(name, () => {
      const testJobData: ConversionJobData = {
        mediaId: "test-media-id",
        conversions: {
          thumb: { width: 150, height: 150 },
        },
        originalPath: "test/path/file.jpg",
        modelType: "User",
        modelId: "123",
        collectionName: "avatar",
        fileName: "file.jpg",
        disk: "local",
      };

      beforeEach(() => {
        if ("clear" in driver) {
          (driver as InMemoryQueueDriver).clear();
        }
      });

      it("should enqueue a job", async () => {
        const jobId = await driver.enqueue(testJobData);

        expect(typeof jobId).toBe("string");
        expect(jobId.length).toBeGreaterThan(0);
      });

      it("should return job status", async () => {
        const jobId = await driver.enqueue(testJobData);
        const status = await driver.status(jobId);

        expect(status).toHaveProperty("id");
        expect(status).toHaveProperty("status");
        expect(status.id).toBe(jobId);
        expect([
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
        ]).toContain(status.status);
      });

      it("should return queue stats", async () => {
        await driver.enqueue(testJobData);
        const stats = await driver.stats();

        expect(stats).toHaveProperty("waiting");
        expect(stats).toHaveProperty("active");
        expect(stats).toHaveProperty("completed");
        expect(stats).toHaveProperty("failed");

        expect(typeof stats.waiting).toBe("number");
        expect(typeof stats.active).toBe("number");
        expect(typeof stats.completed).toBe("number");
        expect(typeof stats.failed).toBe("number");
      });

      it("should track multiple jobs", async () => {
        const jobId1 = await driver.enqueue(testJobData);
        const jobId2 = await driver.enqueue({
          ...testJobData,
          mediaId: "test-media-id-2",
        });

        expect(jobId1).not.toBe(jobId2);

        const stats = await driver.stats();
        const totalJobs =
          stats.waiting + stats.active + stats.completed + stats.failed;
        expect(totalJobs).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("InMemoryQueueDriver specific", () => {
    let driver: InMemoryQueueDriver;

    beforeEach(() => {
      driver = new InMemoryQueueDriver();
    });

    it("should process jobs with processor", async () => {
      const processedJobs: string[] = [];

      driver.setProcessor(async (data) => {
        processedJobs.push(data.mediaId);
        return { success: true };
      });

      const jobData: ConversionJobData = {
        mediaId: "test-id",
        conversions: { thumb: { width: 150 } },
        originalPath: "path/file.jpg",
        modelType: "User",
        modelId: "123",
        collectionName: "avatar",
        fileName: "file.jpg",
        disk: "local",
      };

      await driver.enqueue(jobData);

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(processedJobs).toContain("test-id");
    });

    it("should handle job completion", async () => {
      driver.setProcessor(async () => ({ success: true }));

      const jobId = await driver.enqueue({
        mediaId: "test-id",
        conversions: {},
        originalPath: "path/file.jpg",
        modelType: "User",
        modelId: "123",
        collectionName: "avatar",
        fileName: "file.jpg",
        disk: "local",
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = await driver.status(jobId);
      expect(["completed", "active"]).toContain(status.status);
    });
  });
});
