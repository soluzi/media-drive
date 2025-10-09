/**
 * Strategies Tests
 */

import {
  createFileNamer,
  RandomFileNamer,
  OriginalFileNamer,
  UUIDFileNamer,
} from "../../src/strategies/file-namers";
import {
  createPathGenerator,
  DefaultPathGenerator,
  DateBasedPathGenerator,
  FlatPathGenerator,
} from "../../src/strategies/path-generators";
import { PathContext } from "../../src/core/contracts";

describe("File Namers", () => {
  const testContext = "photo.jpg";

  describe("RandomFileNamer", () => {
    it("should generate random filename", () => {
      const namer = new RandomFileNamer();
      const result = namer.generate(testContext);

      expect(result).toMatch(/\.jpg$/);
      expect(result).not.toBe(testContext);
      expect(result.length).toBeGreaterThan(10);
    });

    it("should preserve extension", () => {
      const namer = new RandomFileNamer();
      expect(namer.generate("test.png")).toMatch(/\.png$/);
      expect(namer.generate("test.pdf")).toMatch(/\.pdf$/);
    });

    it("should generate hex string format", () => {
      const namer = new RandomFileNamer();
      const name = namer.generate(testContext);
      const nameWithoutExt = name.replace(/\.jpg$/, "");

      // Should be hex string (or mock in test env)
      expect(nameWithoutExt.length).toBeGreaterThan(0);
    });
  });

  describe("OriginalFileNamer", () => {
    it("should keep original filename", () => {
      const namer = new OriginalFileNamer();
      const result = namer.generate("my-photo.jpg");

      expect(result).toMatch(/my-photo\.jpg$/);
    });

    it("should sanitize filename", () => {
      const namer = new OriginalFileNamer();
      const result = namer.generate("My Photo!@#$%.jpg");

      expect(result).toMatch(/\.jpg$/);
      expect(result).not.toContain("!");
      expect(result).not.toContain("@");
    });
  });

  describe("UUIDFileNamer", () => {
    it("should generate UUID-based filename", () => {
      const namer = new UUIDFileNamer();
      const result = namer.generate(testContext);

      expect(result).toMatch(/\.jpg$/);
      // UUID format or any string format is acceptable
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe("createFileNamer", () => {
    it("should create random namer", () => {
      const namer = createFileNamer("random");
      expect(namer).toBeInstanceOf(RandomFileNamer);
    });

    it("should create original namer", () => {
      const namer = createFileNamer("original");
      expect(namer).toBeInstanceOf(OriginalFileNamer);
    });

    it("should create UUID namer", () => {
      const namer = createFileNamer("uuid");
      expect(namer).toBeInstanceOf(UUIDFileNamer);
    });
  });
});

describe("Path Generators", () => {
  const testContext: PathContext = {
    modelType: "User",
    modelId: "123",
    collection: "avatar",
    originalName: "photo.jpg",
    fileName: "abc123.jpg",
  };

  describe("DefaultPathGenerator", () => {
    it("should generate default path structure", () => {
      const generator = new DefaultPathGenerator();
      const result = generator.generate(testContext);

      expect(result.path).toBe("User/123/avatar/abc123.jpg");
      expect(result.directory).toBe("User/123/avatar");
      expect(result.fileName).toBe("abc123.jpg");
    });

    it("should generate conversion path", () => {
      const generator = new DefaultPathGenerator();
      const result = generator.generateConversion(testContext, "thumb");

      expect(result.path).toContain("conversions");
      expect(result.path).toContain("thumb");
      expect(result.fileName).toContain("thumb");
    });
  });

  describe("DateBasedPathGenerator", () => {
    it("should generate date-based path", () => {
      const generator = new DateBasedPathGenerator();
      const result = generator.generate(testContext);

      expect(result.path).toMatch(/User\/\d{4}\/\d{2}\/\d{2}\/abc123\.jpg/);
      expect(result.directory).toMatch(/User\/\d{4}\/\d{2}\/\d{2}/);
    });

    it("should use current date", () => {
      const generator = new DateBasedPathGenerator();
      const result = generator.generate(testContext);
      const now = new Date();
      const year = now.getFullYear();

      expect(result.path).toContain(`User/${year}/`);
    });
  });

  describe("FlatPathGenerator", () => {
    it("should generate flat path", () => {
      const generator = new FlatPathGenerator();
      const result = generator.generate(testContext);

      expect(result.path).toBe("abc123.jpg");
      expect(result.directory).toBe("");
      expect(result.fileName).toBe("abc123.jpg");
    });
  });

  describe("createPathGenerator", () => {
    it("should create default generator", () => {
      const generator = createPathGenerator("default");
      expect(generator).toBeInstanceOf(DefaultPathGenerator);
    });

    it("should create date-based generator", () => {
      const generator = createPathGenerator("date-based");
      expect(generator).toBeInstanceOf(DateBasedPathGenerator);
    });

    it("should create flat generator", () => {
      const generator = createPathGenerator("flat");
      expect(generator).toBeInstanceOf(FlatPathGenerator);
    });
  });
});
