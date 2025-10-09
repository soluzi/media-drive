/**
 * Storage Drivers Contract Tests
 */

import { StorageDriver } from "../../src/core/contracts";
import { MockStorageDriver } from "../__mocks__/mock-storage.driver";

describe("StorageDriver Contract", () => {
  describe.each([
    {
      name: "MockStorageDriver",
      createDriver: () => new MockStorageDriver(),
    },
  ])("$name", ({ createDriver }) => {
    let driver: StorageDriver;
    const testPath = `test-${Date.now()}.txt`;
    const testContent = Buffer.from("test content");

    beforeEach(() => {
      driver = createDriver();
    });

    it("should implement put()", async () => {
      const result = await driver.put(testPath, testContent);

      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("size");
      expect(result.path).toBe(testPath);
      expect(result.size).toBeGreaterThan(0);
    });

    it("should implement get()", async () => {
      await driver.put(testPath, testContent);
      const buffer = await driver.get(testPath);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe(testContent.toString());
    });

    it("should implement exists()", async () => {
      await driver.put(testPath, testContent);
      const exists = await driver.exists(testPath);

      expect(exists).toBe(true);
    });

    it("should return false for non-existent files", async () => {
      const exists = await driver.exists("non-existent-file.txt");

      expect(exists).toBe(false);
    });

    it("should implement delete()", async () => {
      await driver.put(testPath, testContent);
      await driver.delete(testPath);

      const exists = await driver.exists(testPath);
      expect(exists).toBe(false);
    });

    it("should implement url()", () => {
      const url = driver.url(testPath);

      expect(typeof url).toBe("string");
      expect(url).toContain(testPath);
    });

    it("should implement temporaryUrl()", async () => {
      const url = await driver.temporaryUrl(testPath, 3600);

      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });

    it("should handle string content", async () => {
      const result = await driver.put(`string-${testPath}`, "string content");

      expect(result.size).toBeGreaterThan(0);

      const buffer = await driver.get(`string-${testPath}`);
      expect(buffer.toString()).toBe("string content");
    });

    it("should handle nested paths", async () => {
      const nestedPath = `dir1/dir2/${testPath}`;
      await driver.put(nestedPath, testContent);

      const exists = await driver.exists(nestedPath);
      expect(exists).toBe(true);

      await driver.delete(nestedPath);
    });
  });
});
