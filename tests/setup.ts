// Test setup file for Jest
// This file sets up mocks and global test configuration

// Mock Prisma Client
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    media: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

// Mock Sharp
jest.mock("sharp", () => {
  const mockSharp = jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-image-data")),
  }));

  return mockSharp;
});

// Mock file-type
jest.mock("file-type", () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: "image/jpeg" }),
}));

// Mock axios
jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({
    data: Buffer.from("mock-file-data"),
    headers: { "content-type": "image/jpeg" },
  }),
}));

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://mock-signed-url.com"),
}));

// Mock fs/promises
jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from("mock-file-data")),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    size: 1024,
    mtime: new Date("2023-01-01"),
  }),
}));

// Mock path
jest.mock("path", () => ({
  join: jest.fn((...args: any[]) => args.join("/")),
  dirname: jest.fn((path: any) => path.substring(0, path.lastIndexOf("/"))),
  extname: jest.fn((path: any) => {
    const lastDot = path.lastIndexOf(".");
    return lastDot === -1 ? "" : path.substring(lastDot);
  }),
  basename: jest.fn((path: any, ext?: any) => {
    const base = path.split("/").pop() || "";
    return ext ? base.replace(ext, "") : base;
  }),
  posix: {
    join: jest.fn((...args: any[]) => args.join("/")),
  },
}));

// Mock crypto
jest.mock("crypto", () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("mockrandomstring"),
  }),
}));

// Global test timeout
jest.setTimeout(10000);
