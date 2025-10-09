/**
 * Mock setup for Jest
 */

// Mock crypto module for consistent random values in tests
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomBytes: jest.fn((size: number) => {
    return Buffer.from(
      "mockrandomstring".repeat(Math.ceil(size / 16)).slice(0, size)
    );
  }),
}));
