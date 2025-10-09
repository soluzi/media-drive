/**
 * Registry Tokens
 *
 * Define symbols for dependency injection
 */

export const TOKENS = {
  // Core Services
  CONFIG: Symbol("Config"),
  LOGGER: Symbol("Logger"),
  PRISMA: Symbol("PrismaClient"),

  // Storage
  STORAGE_DRIVER: Symbol("StorageDriver"),

  // Conversion
  CONVERSION_PROCESSOR: Symbol("ConversionProcessor"),

  // Queue
  QUEUE_DRIVER: Symbol("QueueDriver"),

  // Utilities
  PATH_GENERATOR: Symbol("PathGenerator"),
  FILE_NAMER: Symbol("FileNamer"),
  URL_SIGNER: Symbol("UrlSigner"),
} as const;

export type TokenType = (typeof TOKENS)[keyof typeof TOKENS];
