import { jest } from "@jest/globals";
import {
  randomFileName,
  objectPath,
  conversionPath,
  randomObjectPath,
  detectMimeType,
  getExtensionFromMimeType,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
} from "../src/media/utils";

describe("Media Utils", () => {
  describe("randomFileName", () => {
    it("should preserve file extension", () => {
      const originalName = "test-image.jpg";
      const randomName = randomFileName(originalName);

      expect(randomName).toMatch(/^[a-f0-9]{32}\.jpg$/);
    });

    it("should handle files without extension", () => {
      const originalName = "testfile";
      const randomName = randomFileName(originalName);

      expect(randomName).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should handle files with multiple dots", () => {
      const originalName = "test.file.name.png";
      const randomName = randomFileName(originalName);

      expect(randomName).toMatch(/^[a-f0-9]{32}\.png$/);
    });
  });

  describe("objectPath", () => {
    it("should generate correct path structure", () => {
      const path = objectPath("user", "123", "avatar", "image.jpg");
      expect(path).toBe("user/123/avatar/image.jpg");
    });

    it("should sanitize model type and collection names", () => {
      const path = objectPath(
        "user-model",
        "123",
        "avatar-collection",
        "image.jpg"
      );
      expect(path).toBe("user_model/123/avatar_collection/image.jpg");
    });
  });

  describe("conversionPath", () => {
    it("should generate conversion path with conversion name", () => {
      const path = conversionPath(
        "user",
        "123",
        "avatar",
        "image.jpg",
        "thumb"
      );
      expect(path).toBe("user/123/avatar/conversions/image-thumb.jpg");
    });

    it("should handle files without extension", () => {
      const path = conversionPath("user", "123", "avatar", "image", "thumb");
      expect(path).toBe("user/123/avatar/conversions/image-thumb");
    });
  });

  describe("randomObjectPath", () => {
    it("should return both path and filename", () => {
      const result = randomObjectPath("user", "123", "avatar", "image.jpg");

      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("fileName");
      expect(result.fileName).toMatch(/^[a-f0-9]{32}\.jpg$/);
      expect(result.path).toMatch(/^user\/123\/avatar\/[a-f0-9]{32}\.jpg$/);
    });
  });

  describe("detectMimeType", () => {
    it("should detect MIME type from buffer", async () => {
      const buffer = Buffer.from("fake-image-data");
      const mimeType = await detectMimeType(buffer);

      expect(mimeType).toBe("image/jpeg");
    });

    it("should return default MIME type for unknown buffer", async () => {
      // Mock file-type to return null
      const { fileTypeFromBuffer } = await import("file-type");
      (fileTypeFromBuffer as jest.Mock).mockResolvedValueOnce("" as never);

      const buffer = Buffer.from("unknown-data");
      const mimeType = await detectMimeType(buffer);

      expect(mimeType).toBe("application/octet-stream");
    });
  });

  describe("getExtensionFromMimeType", () => {
    it("should return correct extension for known MIME types", () => {
      expect(getExtensionFromMimeType("image/jpeg")).toBe(".jpg");
      expect(getExtensionFromMimeType("image/png")).toBe(".png");
      expect(getExtensionFromMimeType("image/gif")).toBe(".gif");
      expect(getExtensionFromMimeType("image/webp")).toBe(".webp");
      expect(getExtensionFromMimeType("image/avif")).toBe(".avif");
      expect(getExtensionFromMimeType("video/mp4")).toBe(".mp4");
      expect(getExtensionFromMimeType("audio/mpeg")).toBe(".mp3");
      expect(getExtensionFromMimeType("application/pdf")).toBe(".pdf");
    });

    it("should return empty string for unknown MIME type", () => {
      expect(getExtensionFromMimeType("unknown/type")).toBe("");
    });
  });

  describe("isImageMimeType", () => {
    it("should return true for image MIME types", () => {
      expect(isImageMimeType("image/jpeg")).toBe(true);
      expect(isImageMimeType("image/png")).toBe(true);
      expect(isImageMimeType("image/gif")).toBe(true);
      expect(isImageMimeType("image/webp")).toBe(true);
      expect(isImageMimeType("image/svg+xml")).toBe(true);
    });

    it("should return false for non-image MIME types", () => {
      expect(isImageMimeType("video/mp4")).toBe(false);
      expect(isImageMimeType("audio/mpeg")).toBe(false);
      expect(isImageMimeType("application/pdf")).toBe(false);
      expect(isImageMimeType("text/plain")).toBe(false);
    });
  });

  describe("isVideoMimeType", () => {
    it("should return true for video MIME types", () => {
      expect(isVideoMimeType("video/mp4")).toBe(true);
      expect(isVideoMimeType("video/webm")).toBe(true);
      expect(isVideoMimeType("video/quicktime")).toBe(true);
    });

    it("should return false for non-video MIME types", () => {
      expect(isVideoMimeType("image/jpeg")).toBe(false);
      expect(isVideoMimeType("audio/mpeg")).toBe(false);
      expect(isVideoMimeType("application/pdf")).toBe(false);
    });
  });

  describe("isAudioMimeType", () => {
    it("should return true for audio MIME types", () => {
      expect(isAudioMimeType("audio/mpeg")).toBe(true);
      expect(isAudioMimeType("audio/wav")).toBe(true);
      expect(isAudioMimeType("audio/ogg")).toBe(true);
    });

    it("should return false for non-audio MIME types", () => {
      expect(isAudioMimeType("image/jpeg")).toBe(false);
      expect(isAudioMimeType("video/mp4")).toBe(false);
      expect(isAudioMimeType("application/pdf")).toBe(false);
    });
  });
});
