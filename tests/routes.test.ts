import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import multer from "multer";
import { createMediaRouter } from "../src/media/routes";
import { MediaLibrary } from "../src/media/service";

// Mock the MediaLibrary service
jest.mock("../src/media/service", () => ({
  MediaLibrary: jest.fn().mockImplementation(() => ({
    attachFile: jest.fn(),
    attachFromUrl: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    resolveFileUrl: jest.fn(),
  })),
}));

describe("Media Routes", () => {
  let app: express.Application;
  let mockMediaLibrary: jest.Mocked<MediaLibrary>;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create mock media library instance
    mockMediaLibrary = {
      attachFile: jest.fn(),
      attachFromUrl: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      resolveFileUrl: jest.fn(),
    } as any;

    // Mock the MediaLibrary constructor to return our mock
    (MediaLibrary as jest.Mock).mockImplementation(() => mockMediaLibrary);

    const mediaRouter = createMediaRouter();
    app.use("/media", mediaRouter);

    jest.clearAllMocks();
  });

  describe("POST /media/:modelType/:modelId/:collection", () => {
    it("should upload file successfully", async () => {
      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        name: "test-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockMediaLibrary.attachFile.mockResolvedValue(mockMediaRecord as any);

      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .attach("file", Buffer.from("test-image-data"), "test-image.jpg")
        .field("name", "test-image.jpg");

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMediaRecord);
      expect(mockMediaLibrary.attachFile).toHaveBeenCalledWith(
        "user",
        "user-123",
        expect.objectContaining({
          originalname: "test-image.jpg",
          buffer: Buffer.from("test-image-data"),
        }),
        expect.objectContaining({
          collection: "avatar",
          name: "test-image.jpg",
        })
      );
    });

    it("should handle conversions and custom properties", async () => {
      const conversions = { thumb: { width: 150, height: 150 } };
      const customProperties = { alt: "Profile picture" };
      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "avatar",
        name: "test-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: conversions,
        custom_properties: customProperties,
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockMediaLibrary.attachFile.mockResolvedValue(mockMediaRecord as any);

      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .attach("file", Buffer.from("test-image-data"), "test-image.jpg")
        .field("name", "test-image.jpg")
        .field("disk", "s3")
        .field("conversions", JSON.stringify(conversions))
        .field("customProperties", JSON.stringify(customProperties));

      expect(response.status).toBe(201);
      expect(mockMediaLibrary.attachFile).toHaveBeenCalledWith(
        "user",
        "user-123",
        expect.any(Object),
        expect.objectContaining({
          collection: "avatar",
          name: "test-image.jpg",
          disk: "s3",
          conversions,
          customProperties,
        })
      );
    });

    it("should return 400 when no file uploaded", async () => {
      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .field("name", "test-image.jpg");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No file uploaded");
    });

    it("should return 400 for invalid JSON in conversions", async () => {
      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .attach("file", Buffer.from("test-image-data"), "test-image.jpg")
        .field("conversions", "invalid-json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid conversions JSON");
    });

    it("should return 400 for invalid JSON in custom properties", async () => {
      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .attach("file", Buffer.from("test-image-data"), "test-image.jpg")
        .field("customProperties", "invalid-json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid custom properties JSON");
    });

    it("should return 500 when upload fails", async () => {
      mockMediaLibrary.attachFile.mockRejectedValue(new Error("Upload failed"));

      const response = await request(app)
        .post("/media/user/user-123/avatar")
        .attach("file", Buffer.from("test-image-data"), "test-image.jpg");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Upload failed");
    });
  });

  describe("POST /media/from-url", () => {
    it("should attach file from URL successfully", async () => {
      const mockMediaRecord = {
        id: "media-123",
        model_type: "user",
        model_id: "user-123",
        collection_name: "default",
        name: "downloaded-image.jpg",
        file_name: "randomfilename.jpg",
        mime_type: "image/jpeg",
        disk: "local",
        size: 1024,
        manipulations: {},
        custom_properties: {},
        responsive_images: {},
        order_column: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockMediaLibrary.attachFromUrl.mockResolvedValue(mockMediaRecord as any);

      const requestBody = {
        modelType: "user",
        modelId: "user-123",
        url: "https://example.com/image.jpg",
        name: "downloaded-image.jpg",
        conversions: { thumb: { width: 150, height: 150 } },
      };

      const response = await request(app)
        .post("/media/from-url")
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMediaRecord);
      expect(mockMediaLibrary.attachFromUrl).toHaveBeenCalledWith(
        "user",
        "user-123",
        "https://example.com/image.jpg",
        expect.objectContaining({
          collection: "default",
          name: "downloaded-image.jpg",
          conversions: { thumb: { width: 150, height: 150 } },
        })
      );
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await request(app).post("/media/from-url").send({
        modelType: "user",
        // missing modelId and url
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "modelType, modelId, and url are required"
      );
    });

    it("should return 500 when URL attachment fails", async () => {
      mockMediaLibrary.attachFromUrl.mockRejectedValue(
        new Error("URL attachment failed")
      );

      const requestBody = {
        modelType: "user",
        modelId: "user-123",
        url: "https://example.com/image.jpg",
      };

      const response = await request(app)
        .post("/media/from-url")
        .send(requestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("URL attachment failed");
    });
  });

  describe("GET /media/:modelType/:modelId", () => {
    it("should list media for a model", async () => {
      const mockMediaRecords = [
        {
          id: "media-1",
          model_type: "user",
          model_id: "user-123",
          collection_name: "avatar",
          name: "avatar.jpg",
          file_name: "randomfilename.jpg",
          mime_type: "image/jpeg",
          disk: "local",
          size: 1024,
          manipulations: {},
          custom_properties: {},
          responsive_images: {},
          order_column: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockMediaLibrary.list.mockResolvedValue(mockMediaRecords as any);

      const response = await request(app).get("/media/user/user-123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMediaRecords);
      expect(mockMediaLibrary.list).toHaveBeenCalledWith(
        "user",
        "user-123",
        undefined
      );
    });

    it("should filter by collection", async () => {
      const mockMediaRecords = [];

      mockMediaLibrary.list.mockResolvedValue(mockMediaRecords as any);

      const response = await request(app).get(
        "/media/user/user-123?collection=avatar"
      );

      expect(response.status).toBe(200);
      expect(mockMediaLibrary.list).toHaveBeenCalledWith(
        "user",
        "user-123",
        "avatar"
      );
    });

    it("should return 500 when list fails", async () => {
      mockMediaLibrary.list.mockRejectedValue(new Error("List failed"));

      const response = await request(app).get("/media/user/user-123");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("List failed");
    });
  });

  describe("GET /media/file/:id", () => {
    it("should return file URL", async () => {
      mockMediaLibrary.resolveFileUrl.mockResolvedValue(
        "https://example.com/file.jpg"
      );

      const response = await request(app).get("/media/file/media-123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ url: "https://example.com/file.jpg" });
      expect(mockMediaLibrary.resolveFileUrl).toHaveBeenCalledWith(
        "media-123",
        undefined,
        false,
        false
      );
    });

    it("should handle conversion parameter", async () => {
      mockMediaLibrary.resolveFileUrl.mockResolvedValue(
        "https://example.com/file-thumb.jpg"
      );

      const response = await request(app).get(
        "/media/file/media-123?conversion=thumb"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        url: "https://example.com/file-thumb.jpg",
      });
      expect(mockMediaLibrary.resolveFileUrl).toHaveBeenCalledWith(
        "media-123",
        "thumb",
        false,
        false
      );
    });

    it("should handle signed URL request", async () => {
      mockMediaLibrary.resolveFileUrl.mockResolvedValue(
        "https://example.com/signed-url"
      );

      const response = await request(app).get("/media/file/media-123?signed=1");

      expect(response.status).toBe(200);
      expect(mockMediaLibrary.resolveFileUrl).toHaveBeenCalledWith(
        "media-123",
        undefined,
        true,
        false
      );
    });

    it("should redirect when redirect=1", async () => {
      mockMediaLibrary.resolveFileUrl.mockResolvedValue(
        "https://example.com/file.jpg"
      );

      const response = await request(app)
        .get("/media/file/media-123?redirect=1")
        .redirects(0); // Prevent automatic redirect following

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("https://example.com/file.jpg");
    });

    it("should return 404 when file not found", async () => {
      mockMediaLibrary.resolveFileUrl.mockRejectedValue(
        new Error("File not found")
      );

      const response = await request(app).get("/media/file/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("File not found");
    });
  });

  describe("DELETE /media/:id", () => {
    it("should delete media successfully", async () => {
      mockMediaLibrary.remove.mockResolvedValue(undefined);

      const response = await request(app).delete("/media/media-123");

      expect(response.status).toBe(204);
      expect(mockMediaLibrary.remove).toHaveBeenCalledWith("media-123");
    });

    it("should return 500 when delete fails", async () => {
      mockMediaLibrary.remove.mockRejectedValue(new Error("Delete failed"));

      const response = await request(app).delete("/media/media-123");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Delete failed");
    });
  });
});
