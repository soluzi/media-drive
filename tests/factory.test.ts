/**
 * Factory Tests
 */

import { createMediaLibrary } from "../src/factory";
import { MockPrismaClient } from "./__mocks__/mock-prisma.client";
import { MockStorageDriver } from "./__mocks__/mock-storage.driver";

describe("createMediaLibrary", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new MockPrismaClient();
  });

  afterEach(() => {
    mockPrisma.clear();
  });

  it("should create MediaLibrary instance with default config", () => {
    const mediaLibrary = createMediaLibrary({
      config: {
        disk: "local",
        disks: {
          local: {
            driver: "local",
            root: "uploads",
            public_base_url: "http://localhost/uploads",
          },
        },
      },
      prisma: mockPrisma as any,
    });

    expect(mediaLibrary).toBeDefined();
    expect(mediaLibrary.attachFile).toBeDefined();
    expect(mediaLibrary.list).toBeDefined();
  });

  it("should accept custom config", () => {
    const mediaLibrary = createMediaLibrary({
      config: {
        disk: "local",
        disks: {
          local: {
            driver: "local",
            root: "test-uploads",
            public_base_url: "http://test.local/uploads",
          },
        },
      },
      prisma: mockPrisma as any,
    });

    expect(mediaLibrary).toBeDefined();
  });

  it("should accept custom storage driver", () => {
    const mockStorage = new MockStorageDriver();

    const mediaLibrary = createMediaLibrary({
      prisma: mockPrisma as any,
      providers: {
        storageDriver: mockStorage,
      },
    });

    expect(mediaLibrary).toBeDefined();
  });

  it("should accept custom providers", () => {
    const mockStorage = new MockStorageDriver();

    const mediaLibrary = createMediaLibrary({
      config: {
        disk: "mock",
      },
      prisma: mockPrisma as any,
      providers: {
        storageDriver: mockStorage,
      },
    });

    expect(mediaLibrary).toBeDefined();
  });

  it("should throw on invalid disk config", () => {
    expect(() => {
      createMediaLibrary({
        config: {
          disk: "invalid-disk",
          disks: {
            local: {
              driver: "local",
              root: "uploads",
              public_base_url: "http://localhost/uploads",
            },
          },
        },
        prisma: mockPrisma as any,
      });
    }).toThrow();
  });
});
