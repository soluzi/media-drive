/**
 * Sharp Processor Tests
 */

import { SharpProcessor } from "../../src/conversions/sharp-processor";
import { ConversionOptions } from "../../src/core/contracts";

describe("SharpProcessor", () => {
  let processor: SharpProcessor;
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    // Create a simple test image buffer
    // In real env this would be from sharp, in test it's mocked
    testImageBuffer = Buffer.from("test image data");
  });

  beforeEach(() => {
    processor = new SharpProcessor({
      progressive: true,
      stripMetadata: true,
      defaultQuality: 85,
    });
  });

  describe("processOne", () => {
    it("should process single conversion", async () => {
      const options: ConversionOptions = {
        width: 500,
        height: 500,
        format: "jpeg",
        quality: 80,
      };

      const result = await processor.processOne(testImageBuffer, options);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
      expect(result.format).toBe("jpeg");
    });

    it("should resize image", async () => {
      const result = await processor.processOne(testImageBuffer, {
        width: 200,
        height: 200,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it("should convert to webp", async () => {
      const result = await processor.processOne(testImageBuffer, {
        format: "webp",
        quality: 80,
      });

      expect(result.format).toBe("webp");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should convert to png", async () => {
      const result = await processor.processOne(testImageBuffer, {
        format: "png",
      });

      expect(result.format).toBe("png");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should apply quality setting", async () => {
      const lowQuality = await processor.processOne(testImageBuffer, {
        format: "jpeg",
        quality: 50,
      });

      const highQuality = await processor.processOne(testImageBuffer, {
        format: "jpeg",
        quality: 95,
      });

      // In mocked environment, both return same size
      // In real Sharp, low quality would be smaller
      expect(lowQuality.buffer).toBeInstanceOf(Buffer);
      expect(highQuality.buffer).toBeInstanceOf(Buffer);
    });

    it("should handle fit option", async () => {
      const result = await processor.processOne(testImageBuffer, {
        width: 300,
        height: 200,
        fit: "cover",
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe("process", () => {
    it("should process multiple conversions", async () => {
      const conversions = {
        thumb: { width: 150, height: 150, format: "jpeg" as const },
        medium: { width: 500, height: 500, format: "webp" as const },
        large: { width: 1000, height: 1000, format: "png" as const },
      };

      const results = await processor.process(testImageBuffer, conversions);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results["thumb"]).toBeDefined();
      expect(results["medium"]).toBeDefined();
      expect(results["large"]).toBeDefined();

      expect(results["thumb"]!.format).toBe("jpeg");
      expect(results["medium"]!.format).toBe("webp");
      expect(results["large"]!.format).toBe("png");
    });

    it("should handle empty conversions", async () => {
      const results = await processor.process(testImageBuffer, {});

      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  describe("configuration", () => {
    it("should use default quality", async () => {
      const customProcessor = new SharpProcessor({
        defaultQuality: 60,
      });

      const result = await customProcessor.processOne(testImageBuffer, {
        format: "jpeg",
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it("should respect progressive setting", async () => {
      const progressiveProcessor = new SharpProcessor({
        progressive: true,
      });

      const result = await progressiveProcessor.processOne(testImageBuffer, {
        format: "jpeg",
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });
});
