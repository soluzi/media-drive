/**
 * Registry Tokens
 *
 * Define symbols for dependency injection.
 * These tokens are used to register and resolve dependencies in the DI container.
 */

/**
 * Dependency injection tokens for all registered services.
 * Each token is a unique Symbol used to identify a specific dependency.
 */
export const TOKENS = {
  /** Configuration token - resolves to MediaConfig. */
  CONFIG: Symbol("Config"),
  /** Logger token - resolves to Logger instance. */
  LOGGER: Symbol("Logger"),
  /** Prisma client token - resolves to PrismaClient instance. */
  PRISMA: Symbol("PrismaClient"),

  /** Storage driver token - resolves to StorageDriver implementation. */
  STORAGE_DRIVER: Symbol("StorageDriver"),

  /** Conversion processor token - resolves to ConversionProcessor implementation. */
  CONVERSION_PROCESSOR: Symbol("ConversionProcessor"),

  /** Queue driver token - resolves to QueueDriver implementation. */
  QUEUE_DRIVER: Symbol("QueueDriver"),

  /** Path generator token - resolves to PathGenerator implementation. */
  PATH_GENERATOR: Symbol("PathGenerator"),
  /** File namer token - resolves to FileNamer implementation. */
  FILE_NAMER: Symbol("FileNamer"),
  /** URL signer token - resolves to UrlSigner implementation (optional). */
  URL_SIGNER: Symbol("UrlSigner"),
} as const;

/**
 * Type representing any valid token from the TOKENS object.
 */
export type TokenType = (typeof TOKENS)[keyof typeof TOKENS];
